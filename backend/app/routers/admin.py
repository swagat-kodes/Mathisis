import io
import math
import logging
import os
import re
import time
from typing import Annotated

from google import genai
from google.genai import types
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader

from app.auth import require_admin
from app.config import GEMINI_API_KEY
from app.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ── Constants ──────────────────────────────────────────────
CHUNK_SIZE = 1000      # characters per chunk (captures full definitions)
CHUNK_OVERLAP = 200    # overlap to ensure boundary definitions aren't severed
EMBED_BATCH_SIZE = 5   # keep well under the 100 req/min free-tier limit
EMBED_INTER_BATCH_DELAY = 1.0   # seconds to sleep between batches
EMBED_MAX_RETRIES = 5           # max retries on transient 429 errors
EMBED_MODEL = "gemini-embedding-001"


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Splits text into overlapping character-level chunks (1000 chars, 200 overlap)."""
    if not text:
        return []
    chunks = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start += step
    return chunks


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Generates embeddings for a batch of texts using Gemini.
    
    Retries up to EMBED_MAX_RETRIES times with exponential backoff on
    rate-limit (429) errors before re-raising.
    """
    api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is missing. Please add GEMINI_API_KEY to backend/.env",
        )
    client = gemini_client or genai.Client(api_key=api_key)
    for attempt in range(1, EMBED_MAX_RETRIES + 1):
        try:
            result = client.models.embed_content(
                model=EMBED_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=768,
                ),
            )
            return [e.values for e in result.embeddings]
        except Exception as exc:
            exc_str = str(exc)
            is_rate_limit = "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str
            if is_rate_limit and attempt < EMBED_MAX_RETRIES:
                # Parse retry delay from the error message if present
                retry_match = re.search(r"retry[^\d]*(\d+(?:\.\d+)?)", exc_str, re.I)
                suggested_delay = float(retry_match.group(1)) if retry_match else 0
                backoff = max(suggested_delay, 2 ** attempt)  # exponential, minimum guided
                logger.warning(
                    "Embedding rate-limited (attempt %d/%d). Retrying in %.1fs…",
                    attempt, EMBED_MAX_RETRIES, backoff,
                )
                time.sleep(backoff)
            else:
                raise


@router.post("/upload-pdf")
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF textbook file")],
    year: Annotated[int, Form(ge=1, le=4)],
    semester: Annotated[int, Form(ge=1, le=8)],
    subject_name: Annotated[str, Form(min_length=1)],
    book_name: Annotated[str, Form(min_length=1)],
    _admin=Depends(require_admin),
):
    """
    Admin-only route.
    Accepts a PDF, extracts text page-by-page, chunks it,
    generates Gemini embeddings, and bulk-inserts into Supabase.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )

    supabase = get_supabase()

    # ── Step 1: Resolve or create the subject ──────────────
    subject_result = (
        supabase.table("subjects")
        .select("id")
        .eq("year", year)
        .eq("semester", semester)
        .eq("subject_name", subject_name)
        .execute()
    )
    if subject_result.data:
        subject_id = subject_result.data[0]["id"]
    else:
        new_subject = (
            supabase.table("subjects")
            .insert({"year": year, "semester": semester, "subject_name": subject_name})
            .execute()
        )
        subject_id = new_subject.data[0]["id"]

    # ── Step 2: Parse PDF ──────────────────────────────────
    try:
        raw_bytes = await file.read()
        reader = PdfReader(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse PDF: {exc}",
        )

    # ── Step 3: Extract text per page and chunk ────────────
    records_to_insert: list[dict] = []
    for page_num, page in enumerate(reader.pages, start=1):
        try:
            page_text = page.extract_text() or ""
        except Exception as exc:
            logger.warning("Could not extract text from page %d: %s", page_num, exc)
            continue

        if not page_text.strip():
            continue

        chunks = chunk_text(page_text)
        for chunk_idx, chunk in enumerate(chunks):
            records_to_insert.append({
                "subject_id": subject_id,
                "content": chunk,
                "book_name": book_name,
                "page_number": page_num,
                "chunk_index": chunk_idx,
                # embedding added below in batches
            })

    if not records_to_insert:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No extractable text found in the PDF.",
        )

    # ── Step 4: Generate embeddings in batches ─────────────
    total_batches = math.ceil(len(records_to_insert) / EMBED_BATCH_SIZE)
    logger.info(
        "Generating embeddings for %d chunks in %d batches",
        len(records_to_insert),
        total_batches,
    )

    try:
        for batch_idx in range(total_batches):
            start = batch_idx * EMBED_BATCH_SIZE
            end = start + EMBED_BATCH_SIZE
            batch = records_to_insert[start:end]
            texts = [r["content"] for r in batch]
            embeddings = embed_batch(texts)
            for record, emb in zip(batch, embeddings):
                record["embedding"] = emb
            # Throttle between batches to stay within the free-tier rate limit
            if batch_idx < total_batches - 1:
                time.sleep(EMBED_INTER_BATCH_DELAY)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini embedding API error: {exc}",
        )

    # ── Step 5: Bulk insert into Supabase ──────────────────
    INSERT_BATCH = 100  # Supabase/PostgREST row insert limit per request
    inserted_count = 0
    try:
        for i in range(0, len(records_to_insert), INSERT_BATCH):
            batch = records_to_insert[i: i + INSERT_BATCH]
            supabase.table("textbook_embeddings").insert(batch).execute()
            inserted_count += len(batch)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase insert error after {inserted_count} rows: {exc}",
        )

    return {
        "message": "PDF processed successfully.",
        "subject_id": subject_id,
        "pages_processed": len(reader.pages),
        "chunks_inserted": inserted_count,
    }
