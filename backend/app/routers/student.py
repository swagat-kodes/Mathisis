import asyncio
import logging
import os
import re
from typing import Optional

from groq import Groq
from google import genai
from google.genai import types
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.config import GEMINI_API_KEY, GROQ_API_KEY
from app.database import get_supabase
from app.models.schemas import AskRequest, AskResponse, Source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/student", tags=["Student"])

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

EMBED_MODEL = "gemini-embedding-001"
TOP_K_RESULTS = 12


def _build_rag_prompt(query: str, contexts: list[dict], answer_style: str = "concise", max_chunks: int = 12) -> str:
    """Constructs the RAG prompt from retrieved context chunks."""
    contexts = contexts[:max_chunks]
    context_blocks = []
    for i, ctx in enumerate(contexts, start=1):
        block = (
            f"[Source {i}]\n"
            f"Book: {ctx['book_name']}\n"
            f"Page: {ctx.get('page_number', 'N/A')}\n"
            f"Content: {ctx['content']}"
        )
        context_blocks.append(block)

    context_text = "\n\n---\n\n".join(context_blocks)

    style_instruction = (
        "Keep your response concise, direct, and focused on key facts/definitions."
        if answer_style == "concise"
        else "Provide a comprehensive, detailed, step-by-step explanation with clear examples."
    )

    return f"""You are Mathisis AI, an engineering AI companion. Use the provided textbook excerpts below to answer the student's question.
Response Style Instruction: {style_instruction}

If the student asks a broad or foundational question, prioritize intro definitions or basic summaries from early chapters found in the context.
For every claim or statement in your answer, you MUST cite the source using the format: [Source N].
At the end of your answer, list all cited sources in the format:
📖 [Book Name] — Page [X]

=== TEXTBOOK EXCERPTS START ===
{context_text}
=== TEXTBOOK EXCERPTS END ===

Student Question: {query}

Answer:"""


async def _embed_query_with_retry(query: str, retries: int = 4) -> list[float]:
    """Generates embedding for a query with retry delay on quota rate limits."""
    api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is missing.",
        )
    client = gemini_client or genai.Client(api_key=api_key)
    for attempt in range(retries):
        try:
            embed_result = client.models.embed_content(
                model=EMBED_MODEL,
                contents=query,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY",
                    output_dimensionality=768,
                ),
            )
            return embed_result.embeddings[0].values
        except Exception as exc:
            exc_str = str(exc)
            is_quota = "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str or "quota" in exc_str.lower() or "limit" in exc_str.lower()
            if is_quota and attempt < retries - 1:
                wait = 5 * (attempt + 1)
                logger.warning("Embedding quota / rate limit hit (attempt %d/%d). Waiting %ds...", attempt + 1, retries, wait)
                await asyncio.sleep(wait)
            else:
                raise exc


def _generate_with_groq(prompt: str) -> str:
    """Generates chat answer using Groq Llama 3.3 70B."""
    api_key = GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY environment variable is missing.",
        )
    client = Groq(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    return chat_completion.choices[0].message.content


@router.get("/subjects")
async def list_subjects(
    year: Optional[int] = Query(None, ge=1, le=4),
    semester: Optional[int] = Query(None, ge=1, le=8),
):
    """Lists subjects, optionally filtered by year and/or semester."""
    supabase = get_supabase()
    query = supabase.table("subjects").select("*").order("year").order("semester")

    if year is not None:
        query = query.eq("year", year)
    if semester is not None:
        query = query.eq("semester", semester)

    result = query.execute()
    return result.data


@router.get("/materials")
async def list_materials(
    year: Optional[int] = Query(None, ge=1, le=4),
    semester: Optional[int] = Query(None, ge=1, le=8),
    subject_id: Optional[str] = Query(None),
):
    """Lists uploaded textbook materials for documentation grid."""
    supabase = get_supabase()
    
    # 1. Fetch subjects first to filter materials by year/semester
    subj_query = supabase.table("subjects").select("*")
    if year is not None:
        subj_query = subj_query.eq("year", year)
    if semester is not None:
        subj_query = subj_query.eq("semester", semester)
    if subject_id:
        subj_query = subj_query.eq("id", subject_id)

    subjs = subj_query.execute().data or []
    if not subjs:
        return []

    subj_dict = {s["id"]: s for s in subjs}
    target_subject_ids = list(subj_dict.keys())

    # 2. Fetch distinct books/materials from textbook_embeddings for target subjects
    emb_query = (
        supabase.table("textbook_embeddings")
        .select("subject_id, book_name, page_number")
        .in_("subject_id", target_subject_ids)
        .execute()
    )

    rows = emb_query.data or []
    materials_map = {}
    for r in rows:
        sid = r["subject_id"]
        bname = r["book_name"]
        key = (sid, bname)
        if key not in materials_map:
            s_info = subj_dict.get(sid, {})
            materials_map[key] = {
                "id": f"{sid}-{bname}",
                "subject_id": sid,
                "book_name": bname,
                "subject_name": s_info.get("subject_name", "General"),
                "year": s_info.get("year"),
                "semester": s_info.get("semester"),
                "max_page": r.get("page_number") or 1,
            }
        else:
            p = r.get("page_number") or 1
            if p > materials_map[key]["max_page"]:
                materials_map[key]["max_page"] = p

    return list(materials_map.values())


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    _user=Depends(get_current_user),
):
    """Student RAG endpoint with answer_style support."""
    supabase = get_supabase()

    # Step 1: Embed query
    try:
        query_embedding = await _embed_query_with_retry(request.query)
    except Exception as exc:
        logger.error("Failed to embed query: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to embed query: {exc}",
        )

    # Step 2: Vector similarity search
    try:
        rpc_result = supabase.rpc(
            "match_embeddings",
            {
                "query_embedding": query_embedding,
                "p_subject_id": request.subject_id,
                "match_count": TOP_K_RESULTS,
            },
        ).execute()
        contexts = rpc_result.data or []
    except Exception as exc:
        logger.error("Vector search failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Vector search failed: {exc}",
        )

    if not contexts:
        return AskResponse(
            answer="I could not find relevant textbook material for this subject yet. "
                   "Please ask your admin to upload the course textbooks.",
            sources=[],
        )

    await asyncio.sleep(1)

    # Step 3: Generate answer with Groq (Llama 3.3 70B)
    try:
        style = request.answer_style or "concise"
        prompt = _build_rag_prompt(request.query, contexts, answer_style=style)
        answer_text = _generate_with_groq(prompt)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Groq generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Groq generation failed: {exc}",
        )

    # Step 4: Build deduplicated source list
    seen = set()
    sources: list[Source] = []
    for ctx in contexts:
        key = (ctx["book_name"], ctx.get("page_number"))
        if key not in seen:
            seen.add(key)
            sources.append(
                Source(
                    book_name=ctx["book_name"],
                    page_number=ctx.get("page_number"),
                    similarity=round(ctx.get("similarity", 0), 4),
                )
            )

    return AskResponse(answer=answer_text, sources=sources)
