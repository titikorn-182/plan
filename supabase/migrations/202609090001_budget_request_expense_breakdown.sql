begin;

alter table public.budget_requests add column expense_breakdown jsonb;

comment on column public.budget_requests.expense_breakdown is
  'Amounts in baht for the seven request expense categories; NULL preserves legacy requests without a breakdown.';

create function private.valid_budget_expense_breakdown(breakdown jsonb, requested_amount numeric)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  category_ids constant text[] := array[
    'operating_compensation', 'operating_services', 'operating_materials',
    'capital_equipment', 'capital_construction',
    'personnel_compensation', 'personnel_salary'
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
  if (select count(*) from jsonb_object_keys(breakdown)) <> 7
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

alter table public.budget_requests
  add constraint budget_requests_expense_breakdown_check
  check (private.valid_budget_expense_breakdown(expense_breakdown, requested_amount));

commit;
