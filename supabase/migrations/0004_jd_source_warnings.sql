-- Phase 2 - extend job_descriptions table with source + warnings.
--
-- The existing migration (0001) created job_descriptions with id, raw_text,
-- source_name, created_at. Phase 2 adds:
--   source   text NOT NULL DEFAULT 'text'
--   warnings jsonb NOT NULL DEFAULT '[]'
--
-- `source` is one of 'text' | 'pdf' | 'docx'. `warnings` is an array of
-- free-form parser diagnostics (e.g. 'PDF appears to be a scan, text
-- extraction may be incomplete').

alter table public.job_descriptions
  add column if not exists source text not null default 'text';

alter table public.job_descriptions
  add column if not exists warnings jsonb not null default '[]'::jsonb;
