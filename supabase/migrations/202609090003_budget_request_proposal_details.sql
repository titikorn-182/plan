begin;

alter table public.budget_requests
  add column proposal_details jsonb not null default '{}'::jsonb;

alter table public.budget_requests
  add constraint budget_requests_proposal_details_object_check
  check (jsonb_typeof(proposal_details) = 'object');

comment on column public.budget_requests.proposal_details is
  'Structured project, strategy, funding, output, schedule, and approval details captured from the annual budget request form.';

commit;
