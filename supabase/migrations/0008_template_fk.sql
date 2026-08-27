-- Phase 4 - fix template_id FK on resume_versions.
--
-- Phase 0 created a 'templates' table without tex_source. Phase 4 added
-- 'resume_templates' with tex_source. The auto-generated FK on
-- resume_versions.template_id points to the phase-0 templates table.
-- Drop it and re-add it pointing to resume_templates.

alter table public.resume_versions
  drop constraint if exists resume_versions_template_id_fkey;

alter table public.resume_versions
  add constraint resume_versions_template_id_fkey
  foreign key (template_id) references public.resume_templates(id)
  on delete set null;
