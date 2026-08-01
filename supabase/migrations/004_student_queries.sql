-- ============================================================
-- Migration 004: Student Queries (Forum) Table
-- ============================================================

CREATE TYPE query_status AS ENUM ('open', 'closed');

CREATE TABLE IF NOT EXISTS public.student_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status query_status NOT NULL DEFAULT 'open',
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for subject filtering
CREATE INDEX IF NOT EXISTS student_queries_subject_idx
    ON public.student_queries(subject_id);

-- Index for student filtering
CREATE INDEX IF NOT EXISTS student_queries_student_idx
    ON public.student_queries(student_id);

-- Enable RLS
ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read queries
CREATE POLICY "Authenticated users can read queries"
    ON public.student_queries FOR SELECT
    TO authenticated
    USING (true);

-- Students can insert their own queries
CREATE POLICY "Students can create queries"
    ON public.student_queries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own open queries
CREATE POLICY "Students can update own queries"
    ON public.student_queries FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id AND status = 'open');

-- Admins can update any query (close/flag)
CREATE POLICY "Admins can update any query"
    ON public.student_queries FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete any query
CREATE POLICY "Admins can delete queries"
    ON public.student_queries FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER student_queries_updated_at
    BEFORE UPDATE ON public.student_queries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
