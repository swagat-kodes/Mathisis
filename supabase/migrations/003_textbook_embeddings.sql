-- ============================================================
-- Migration 003: Textbook Embeddings Table
-- Uses pgvector's vector(768) for Gemini text-embedding-004
-- ============================================================

CREATE TABLE IF NOT EXISTS public.textbook_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    book_name TEXT NOT NULL,
    page_number INTEGER,
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for approximate nearest neighbor search
-- NOTE: Requires at least ~1000 rows to be effective.
-- Run "SELECT count(*) FROM textbook_embeddings;" and only
-- create this index after bulk inserts.
-- The index uses 100 lists; adjust based on row count.
CREATE INDEX IF NOT EXISTS textbook_embeddings_embedding_idx
    ON public.textbook_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Standard index for subject_id filtering
CREATE INDEX IF NOT EXISTS textbook_embeddings_subject_idx
    ON public.textbook_embeddings(subject_id);

-- Enable RLS
ALTER TABLE public.textbook_embeddings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read embeddings (needed for RAG)
CREATE POLICY "Authenticated users can read embeddings"
    ON public.textbook_embeddings FOR SELECT
    TO authenticated
    USING (true);

-- Only service role (backend) can insert/update/delete
-- The backend uses SUPABASE_SERVICE_KEY which bypasses RLS anyway
CREATE POLICY "Service role manages embeddings"
    ON public.textbook_embeddings FOR ALL
    USING (auth.role() = 'service_role');
