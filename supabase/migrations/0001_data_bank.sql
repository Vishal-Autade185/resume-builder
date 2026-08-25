-- Phase 0 — resume-builder data bank schema
-- 
-- Run this in the Supabase SQL editor for project ovmfuqapvjaqzwulyteq.
-- Idempotent: every CREATE has IF NOT EXISTS / equivalent guards so re-runs
-- don't error. Storage buckets are created separately via the dashboard or
-- a follow-up migration.

-- A single row per "user" — phase 0 is single-user, so a hardcoded id is
-- fine. The anon key has no concept of "the user"; the service_role key
-- writes these rows from the backend on the user's behalf.
create table if not exists public.data_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000',
  personal jsonb not null,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  publications jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- One data_bank row per user.
create unique index if not exists data_bank_user_id_unique
  on public.data_bank (user_id);

-- Templates the user has uploaded.
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000',
  name text not null,
  storage_path text not null,
  main_file text not null,
  field_map_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists templates_user_id_idx
  on public.templates (user_id);

-- Job descriptions — used by phase 2+, schema created in phase 0 so future
-- migrations don't have to invent it.
create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000',
  raw_text text not null,
  source_name text,
  created_at timestamptz not null default now()
);

create index if not exists job_descriptions_user_id_idx
  on public.job_descriptions (user_id);

-- Resume versions — created in phase 1. Schema here so we don't run a
-- migration the moment phase 1 starts.
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000',
  -- Free-form label, e.g. "Google — SWE Intern, 2026-08"
  label text not null,
  -- Snapshot of the data bank at the time the version was rendered.
  data_bank_snapshot jsonb not null,
  template_id uuid references public.templates(id) on delete set null,
  -- Style settings snapshot (focus/quantify/ats toggles — phase 3+).
  style_settings jsonb not null default '{}'::jsonb,
  -- Generated PDF in Storage; null until first compile succeeds.
  pdf_storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists resume_versions_user_id_idx
  on public.resume_versions (user_id);

-- updated_at trigger so the apps/web auto-save can read latest_writes.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists data_bank_touch on public.data_bank;
create trigger data_bank_touch
  before update on public.data_bank
  for each row execute function public.touch_updated_at();

-- Row Level Security — turned on. Policies below grant the single hardcoded
-- user full access via service_role bypasses RLS by default, so these are
-- meaningful only if you ever add the anon key flow (don't, for now).
alter table public.data_bank enable row level security;
alter table public.templates enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.resume_versions enable row level security;

-- Service role key bypasses RLS by design; these policies matter only when
-- the anon key is in play. Phase 0 uses the service role server-side, so
-- these are precautionary and never matched.
drop policy if exists "single user can read own data_bank" on public.data_bank;
create policy "single user can read own data_bank" on public.data_bank
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own data_bank" on public.data_bank;
create policy "single user can write own data_bank" on public.data_bank
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can read own templates" on public.templates;
create policy "single user can read own templates" on public.templates
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own templates" on public.templates;
create policy "single user can write own templates" on public.templates
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can read own jds" on public.job_descriptions;
create policy "single user can read own jds" on public.job_descriptions
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own jds" on public.job_descriptions;
create policy "single user can write own jds" on public.job_descriptions
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can read own versions" on public.resume_versions;
create policy "single user can read own versions" on public.resume_versions
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own versions" on public.resume_versions;
create policy "single user can write own versions" on public.resume_versions
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);
