-- ============================================================
-- Migration 005: RPC Function for Vector Similarity Search
-- ============================================================

-- match_embeddings: Returns top-k chunks by cosine similarity
-- filtered by subject_id.
-- Called by the backend student router for RAG context retrieval.
CREATE OR REPLACE FUNCTION public.match_embeddings(
    query_embedding VECTOR(768),
    p_subject_id    UUID,
    match_count     INTEGER DEFAULT 5
)
RETURNS TABLE (
    id          UUID,
    content     TEXT,
    book_name   TEXT,
    page_number INTEGER,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        te.id,
        te.content,
        te.book_name,
        te.page_number,
        1 - (te.embedding <=> query_embedding) AS similarity
    FROM public.textbook_embeddings te
    WHERE te.subject_id = p_subject_id
    ORDER BY te.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION public.match_embeddings(VECTOR(768), UUID, INTEGER)
    TO authenticated, service_role;
