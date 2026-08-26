-- Phase 1 — add `selection` column to resume_versions.
--
-- The original migration (0001_data_bank.sql) didn't include a selection
-- column because phase 0 didn't need it. Phase 1 saves versions with a
-- per-entity selection of which items are included.
--
-- We use JSONB because selections are heterogeneous (different entities,
-- different counts) and JSONB indexes well enough for our list-by-user queries.

alter table public.resume_versions
  add column if not exists selection jsonb not null default '{}'::jsonb;