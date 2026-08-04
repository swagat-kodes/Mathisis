import asyncio
import base64
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


def _parse_base64_image(image_str: str) -> tuple[bytes, str]:
    """Parses base64 image string or Data URL into bytes and mime type."""
    mime_type = "image/jpeg"
    if image_str.startswith("data:"):
        header, base64_data = image_str.split(",", 1)
        if ";" in header and ":" in header:
            mime_type = header.split(":")[1].split(";")[0]
    else:
        base64_data = image_str
    image_bytes = base64.b64decode(base64_data)
    return image_bytes, mime_type


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
    
    emb_query = supabase.table("textbook_embeddings").select("id, subject_id, book_name, page_number")
    if subject_id:
        emb_query = emb_query.eq("subject_id", subject_id)

    rows = emb_query.execute().data or []
    if not rows:
        return []

    subj_ids = list({r["subject_id"] for r in rows if r.get("subject_id")})
    subj_dict = {}
    if subj_ids:
        subjs = supabase.table("subjects").select("*").in_("id", subj_ids).execute().data or []
        subj_dict = {s["id"]: s for s in subjs}

    materials_map = {}
    for r in rows:
        sid = r.get("subject_id", "general")
        bname = r["book_name"]
        key = (sid, bname)
        s_info = subj_dict.get(sid, {})
        if key not in materials_map:
            materials_map[key] = {
                "id": f"{sid}-{bname}",
                "subject_id": sid,
                "book_name": bname,
                "subject_name": s_info.get("subject_name", "General Engineering"),
                "year": s_info.get("year", 1),
                "semester": s_info.get("semester", 1),
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
    """Student RAG and Multimodal Chat endpoint with optional subject_id and vision support."""
    supabase = get_supabase()
    contexts = []

    # Step 1: Embed query and search context if query text exists
    if request.query and request.query.strip():
        try:
            query_embedding = await _embed_query_with_retry(request.query)
            if request.subject_id:
                rpc_result = supabase.rpc(
                    "match_embeddings",
                    {
                        "query_embedding": query_embedding,
                        "p_subject_id": request.subject_id,
                        "match_count": TOP_K_RESULTS,
                    },
                ).execute()
                contexts = rpc_result.data or []
            else:
                try:
                    rpc_result = supabase.rpc(
                        "match_embeddings",
                        {
                            "query_embedding": query_embedding,
                            "p_subject_id": None,
                            "match_count": TOP_K_RESULTS,
                        },
                    ).execute()
                    contexts = rpc_result.data or []
                except Exception:
                    contexts = []

                if not contexts:
                    res = (
                        supabase.table("textbook_embeddings")
                        .select("id, content, book_name, page_number")
                        .limit(TOP_K_RESULTS)
                        .execute()
                    )
                    contexts = res.data or []
        except Exception as exc:
            logger.warning("Embedding search warning: %s", exc)

    # Step 2: Multimodal image processing if request.image is provided
    if request.image:
        try:
            image_bytes, mime_type = _parse_base64_image(request.image)
            api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="GEMINI_API_KEY environment variable is missing.",
                )
            client = gemini_client or genai.Client(api_key=api_key)

            style_instruction = (
                "Keep your response concise, direct, and focused on key facts/definitions."
                if (request.answer_style or "concise") == "concise"
                else "Provide a comprehensive, detailed, step-by-step explanation with clear examples."
            )

            prompt_text = (
                f"You are Mathisis AI, an engineering AI companion. Analyze the attached image alongside the student's question.\n"
                f"Response Style Instruction: {style_instruction}\n\n"
                f"Student Question: {request.query or 'Please analyze this image.'}"
            )

            if contexts:
                context_blocks = []
                for i, ctx in enumerate(contexts[:12], start=1):
                    block = f"[Source {i}]\nBook: {ctx['book_name']}\nPage: {ctx.get('page_number', 'N/A')}\nContent: {ctx['content']}"
                    context_blocks.append(block)
                context_text = "\n\n---\n\n".join(context_blocks)
                prompt_text += f"\n\n=== TEXTBOOK EXCERPTS START ===\n{context_text}\n=== TEXTBOOK EXCERPTS END ==="

            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[image_part, prompt_text],
            )
            answer_text = response.text or "Analyzed image successfully."

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

        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Multimodal vision processing failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Multimodal vision processing failed: {exc}",
            )

    # Step 3: Text query handling
    style = request.answer_style or "concise"

    if contexts:
        prompt = _build_rag_prompt(request.query, contexts, answer_style=style)
    else:
        prompt = f"You are Mathisis AI, an engineering AI companion. Answer the following question:\nQuestion: {request.query}\nAnswer Style: {style}"

    try:
        answer_text = _generate_with_groq(prompt)
    except Exception as exc:
        logger.warning("Groq generation failed, falling back to Gemini: %s", exc)
        try:
            api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
            client = gemini_client or genai.Client(api_key=api_key)
            resp = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
            )
            answer_text = resp.text or "No answer returned."
        except Exception as exc2:
            logger.error("Gemini generation fallback failed: %s", exc2)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Generation failed: {exc2}",
            )

    # Build deduplicated source list
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
