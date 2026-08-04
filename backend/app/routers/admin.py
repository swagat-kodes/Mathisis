import io
import math
import logging
import os
import re
import time
from typing import Annotated, Optional

from google import genai
from google.genai import types
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pypdf import PdfReader

from app.auth import require_admin
from app.config import GEMINI_API_KEY
from app.database import get_supabase
from app.models.schemas import SubjectCreate

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
                retry_match = re.search(r"retry[^\d]*(\d+(?:\.\d+)?)", exc_str, re.I)
                suggested_delay = float(retry_match.group(1)) if retry_match else 0
                backoff = max(suggested_delay, 2 ** attempt)
                logger.warning(
                    "Embedding rate-limited (attempt %d/%d). Retrying in %.1fs…",
                    attempt, EMBED_MAX_RETRIES, backoff,
                )
                time.sleep(backoff)
            else:
                raise


@router.post("/subjects")
async def create_subject(
    payload: SubjectCreate,
    _admin=Depends(require_admin),
):
    """
    Admin-only route to create a new subject for a given year & semester.
    """
    supabase = get_supabase()
    clean_name = payload.subject_name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject name cannot be empty.",
        )

    # Check if subject already exists for this term
    existing = (
        supabase.table("subjects")
        .select("*")
        .eq("year", payload.year)
        .eq("semester", payload.semester)
        .eq("subject_name", clean_name)
        .execute()
    )
    if existing.data and len(existing.data) > 0:
        return existing.data[0]

    try:
        new_subj = (
            supabase.table("subjects")
            .insert({
                "year": payload.year,
                "semester": payload.semester,
                "subject_name": clean_name,
            })
            .execute()
        )
        if new_subj.data and len(new_subj.data) > 0:
            return new_subj.data[0]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create subject in database.",
        )
    except Exception as exc:
        logger.error("Failed to create subject: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error when creating subject: {exc}",
        )


def get_or_create_default_subject(supabase) -> str:
    """Helper to ensure a valid default subject UUID exists for foreign key constraints."""
    try:
        existing = supabase.table("subjects").select("id").eq("subject_name", "General Engineering").execute()
        if existing.data and len(existing.data) > 0:
            return existing.data[0]["id"]
        
        new_subj = (
            supabase.table("subjects")
            .insert({
                "year": 1,
                "semester": 1,
                "subject_name": "General Engineering",
            })
            .execute()
        )
        if new_subj.data and len(new_subj.data) > 0:
            return new_subj.data[0]["id"]

        all_subjs = supabase.table("subjects").select("id").limit(1).execute()
        if all_subjs.data:
            return all_subjs.data[0]["id"]
    except Exception as exc:
        logger.warning("Could not create or fetch default subject: %s", exc)

    return "00000000-0000-0000-0000-000000000000"


@router.post("/upload-textbook")
async def upload_textbook(
    file: Annotated[UploadFile, File(description="PDF textbook file")],
    subject_id: Annotated[Optional[str], Query(description="Subject ID")] = None,
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

    # Validate subject exists or fallback to default subject
    if not subject_id:
        subject_id = get_or_create_default_subject(supabase)
    else:
        subj_check = (
            supabase.table("subjects")
            .select("id, subject_name")
            .eq("id", subject_id)
            .execute()
        )
        if not subj_check.data:
            subject_id = get_or_create_default_subject(supabase)

    book_name = os.path.splitext(file.filename)[0].replace("_", " ").title()

    # Parse PDF
    try:
        raw_bytes = await file.read()
        reader = PdfReader(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse PDF: {exc}",
        )

    # Extract text per page and chunk
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
            })

    if not records_to_insert:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No extractable text found in the PDF.",
        )

    # Generate embeddings in batches
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
            if batch_idx < total_batches - 1:
                time.sleep(EMBED_INTER_BATCH_DELAY)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini embedding API error: {exc}",
        )

    # Bulk insert into Supabase
    INSERT_BATCH = 100
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
        "book_name": book_name,
        "subject_id": subject_id,
        "pages_processed": len(reader.pages),
        "chunks_stored": len(reader.pages),
        "chunks_inserted": inserted_count,
    }


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
    Legacy admin route accepting form fields for subject creation + upload.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )

    supabase = get_supabase()

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

    return await upload_textbook(file=file, subject_id=subject_id, _admin=_admin)

