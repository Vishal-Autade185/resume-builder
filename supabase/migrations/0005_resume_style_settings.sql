-- Phase 3 - resume style settings.
--
-- Per-user toggles that steer AI rewriting per product.md section 2.6:
-- focusOnCore, quantify, noOrphans, ats. Each default to true (sensible
-- starting point). Single row per user.

create table if not exists public.resume_style_settings (
  user_id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  focus_on_core boolean not null default true,
  quantify     boolean not null default true,
  no_orphans    boolean not null default true,
  ats           boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.resume_style_settings enable row level security;

drop policy if exists "single user can read own style settings" on public.resume_style_settings;
create policy "single user can read own style settings" on public.resume_style_settings
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own style settings" on public.resume_style_settings;
create policy "single user can write own style settings" on public.resume_style_settings
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop trigger if exists resume_style_settings_touch on public.resume_style_settings;
create trigger resume_style_settings_touch
  before update on public.resume_style_settings
  for each row execute function public.touch_updated_at();