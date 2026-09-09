begin;

alter table public.budget_requests
  drop constraint if exists budget_requests_expense_breakdown_check;

-- Preserve every existing allocation while extending older seven-category records.
update public.budget_requests
set expense_breakdown = jsonb_build_object(
  'general_subsidy_grant', 0,
  'general_subsidy_compensation', 0,
  'general_subsidy_services', 0,
  'general_subsidy_materials', 0
) || expense_breakdown
where expense_breakdown is not null;

create or replace function private.valid_budget_expense_breakdown(
  breakdown jsonb,
  requested_amount numeric
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  category_ids constant text[] := array[
    'operating_compensation', 'operating_services', 'operating_materials',
    'capital_equipment', 'capital_construction',
    'personnel_compensation', 'personnel_salary',
    'general_subsidy_grant', 'general_subsidy_compensation',
    'general_subsidy_services', 'general_subsidy_materials'
  ];
  category_id text;
  amount numeric;
  total numeric := 0;
begin
  if breakdown is null then
    return true;
  end if;
  if jsonb_typeof(breakdown) <> 'object' then
    return false;
  end if;
  if (select count(*) from jsonb_object_keys(breakdown)) <> cardinality(category_ids)
     or not breakdown ?& category_ids then
    return false;
  end if;

  foreach category_id in array category_ids loop
    if jsonb_typeof(breakdown -> category_id) <> 'number' then
      return false;
    end if;
    amount := (breakdown ->> category_id)::numeric;
    if amount < 0 or amount > 999999999999 or amount <> round(amount, 2) then
      return false;
    end if;
    total := total + amount;
  end loop;

  return total <= 999999999999 and total = requested_amount;
end;
$$;

comment on column public.budget_requests.expense_breakdown is
  'Amounts in baht for the eleven request expense categories; NULL preserves legacy requests without a breakdown.';

alter table public.budget_requests
  add constraint budget_requests_expense_breakdown_check
  check (private.valid_budget_expense_breakdown(expense_breakdown, requested_amount));

commit;
