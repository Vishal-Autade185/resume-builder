-- Phase 4 - resume_templates table.
--
-- Per-user uploaded LaTeX templates. The .zip is stored in the
-- resume_templates storage bucket (created in phase 0). The detected
-- field counts are stored as jsonb so the UI can render the form
-- without re-parsing the .tex on every page load.

create table if not exists public.resume_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  name text not null,
  tex_source text not null,
  detected_fields jsonb not null default '{}'::jsonb,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists resume_templates_user_idx
  on public.resume_templates (user_id, created_at desc);

alter table public.resume_templates enable row level security;

drop policy if exists "single user can read own templates" on public.resume_templates;
create policy "single user can read own templates" on public.resume_templates
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own templates" on public.resume_templates;
create policy "single user can write own templates" on public.resume_templates
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);
