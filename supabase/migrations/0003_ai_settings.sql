-- Phase 2 -- ai_settings table.
--
-- Per-user AI tailoring settings (provider, model, fact-grounding mode,
-- tier). The raw BYOK key is NEVER in this table - we hold that in env vars
-- only. We store the provider + model so the app knows which env var to
-- read at request time.

create table if not exists public.ai_settings (
  user_id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.5-flash',
  fact_grounding text not null default 'loose',
  tier text not null default 'cheap',
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

drop policy if exists "single user can read own ai_settings" on public.ai_settings;
create policy "single user can read own ai_settings" on public.ai_settings
  for select using (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

drop policy if exists "single user can write own ai_settings" on public.ai_settings;
create policy "single user can write own ai_settings" on public.ai_settings
  for all using (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  with check (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Auto-touch on update
drop trigger if exists ai_settings_touch on public.ai_settings;
create trigger ai_settings_touch
  before update on public.ai_settings
  for each row execute function public.touch_updated_at();
