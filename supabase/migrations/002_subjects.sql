-- ============================================================
-- Migration 002: Subjects Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, semester, subject_name)
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read subjects
CREATE POLICY "Authenticated users can read subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert/update/delete subjects
CREATE POLICY "Admins can manage subjects"
    ON public.subjects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Subjects are added by admins via the PDF upload dashboard.
-- No seed data — start clean.
