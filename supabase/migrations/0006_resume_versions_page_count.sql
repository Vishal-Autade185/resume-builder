-- Phase 3 - add page_count to resume_versions.
--
-- Each version gets a single integer counting how many pages its pdf
-- renders to. Phase 3 ships this + a small badge in the dropdown.
-- Phase 3.5+ can use this for one-page overflow enforcement.

alter table public.resume_versions
  add column if not exists page_count integer;