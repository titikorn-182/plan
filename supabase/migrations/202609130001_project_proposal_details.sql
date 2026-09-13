begin;

alter table public.projects
  add column proposal_details jsonb not null default '{}'::jsonb;

alter table public.projects
  add constraint projects_proposal_details_object_check
  check (jsonb_typeof(proposal_details) = 'object');

comment on column public.projects.proposal_details is
  'Structured project proposal content derived from the faculty project proposal form.';

commit;
