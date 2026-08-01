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
TOP_K_RESULTS = 12  # Increased to 12 context chunks to capture intro/fundamental definitions for broad queries


def _build_rag_prompt(query: str, contexts: list[dict], max_chunks: int = 12) -> str:
    """Constructs the RAG prompt from retrieved context chunks (up to top 12)."""
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

    return f"""You are an AI Tutor. Use the provided textbook excerpts below to answer the student's question.
If the student asks a broad or foundational question (e.g., 'What is AI?', 'History of AI', 'Applications'), prioritize intro definitions or basic summaries from early chapters found in the context over specific technical deep-dives.
If the context contains enough relevant details, answer fully. Otherwise, summarize what is available.

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
            detail="GEMINI_API_KEY environment variable is missing. Please add GEMINI_API_KEY to backend/.env",
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
    """Generates chat answer using Groq's super-fast Llama 3 model (llama-3.3-70b-versatile)."""
    api_key = GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY environment variable is missing. Please set GROQ_API_KEY in backend/.env",
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


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    _user=Depends(get_current_user),
):
    """
    Student RAG endpoint.
    1. Embed the query with gemini-embedding-001
    2. Call match_embeddings RPC for top-K context chunks
    3. Build RAG prompt and generate answer (model fallback + exponential backoff)
    4. Return answer + source citations
    """
    supabase = get_supabase()

    # ── Step 1: Embed query ────────────────────────────────
    try:
        query_embedding = await _embed_query_with_retry(request.query)
    except Exception as exc:
        print("🔥 REAL BACKEND ERROR (Embed):", str(exc))
        logger.error("🔥 REAL BACKEND ERROR (Embed): %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to embed query: {exc}",
        )

    # ── Step 2: Vector similarity search ──────────────────
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
        print("🔥 REAL BACKEND ERROR (Vector Search):", str(exc))
        logger.error("🔥 REAL BACKEND ERROR (Vector Search): %s", exc)
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

    # ── Step 3: Small inter-operation delay to prevent RPM burst ──
    await asyncio.sleep(1)

    # ── Step 4: Generate answer with Groq (Llama 3.3 70B) ──
    try:
        prompt = _build_rag_prompt(request.query, contexts)
        answer_text = _generate_with_groq(prompt)
    except HTTPException:
        raise
    except Exception as exc:
        print("🔥 REAL BACKEND ERROR (Groq Answer Generation):", str(exc))
        logger.error("🔥 REAL BACKEND ERROR (Groq Answer Generation): %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Groq generation failed: {exc}",
        )

    # ── Step 4: Build deduplicated source list ─────────────
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
