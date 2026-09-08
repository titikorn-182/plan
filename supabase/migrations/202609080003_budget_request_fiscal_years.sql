begin;

insert into public.fiscal_years (id, buddhist_year, label, status, starts_on, ends_on)
values
  ('30000000-0000-4000-8000-000000000001', 2570, 'ปีงบประมาณ 2570', 'open', '2026-10-01', '2027-09-30'),
  ('30000000-0000-4000-8000-000000000002', 2571, 'ปีงบประมาณ 2571', 'open', '2027-10-01', '2028-09-30'),
  ('30000000-0000-4000-8000-000000000003', 2572, 'ปีงบประมาณ 2572', 'open', '2028-10-01', '2029-09-30')
on conflict (buddhist_year) do update
set
  label = excluded.label,
  status = 'open',
  updated_at = now();

with configured_cycles (buddhist_year, name, closes_at) as (
  values
    (2570, 'รอบคำของบประมาณ 2570', '2027-09-30 23:59:59+07'::timestamptz),
    (2571, 'รอบคำของบประมาณ 2571', '2028-09-30 23:59:59+07'::timestamptz),
    (2572, 'รอบคำของบประมาณ 2572', '2029-09-30 23:59:59+07'::timestamptz)
)
insert into public.budget_cycles (
  fiscal_year_id,
  name,
  status,
  opens_at,
  closes_at,
  allow_staff_submit
)
select
  fiscal_year.id,
  configured_cycle.name,
  'open',
  '2026-09-01 00:00:00+07'::timestamptz,
  configured_cycle.closes_at,
  true
from configured_cycles as configured_cycle
join public.fiscal_years as fiscal_year
  on fiscal_year.buddhist_year = configured_cycle.buddhist_year
on conflict (fiscal_year_id, name) do update
set
  status = 'open',
  allow_staff_submit = true,
  updated_at = now();

commit;
