begin;

create type public.plan_structure_level as enum ('output', 'operational_plan', 'activity');

create table public.plan_structure_master_data (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  level public.plan_structure_level not null,
  code text not null,
  name_th text not null,
  parent_code text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_structure_master_data_code_format check (
    (level = 'output' and code ~ '^[0-9]{4}$' and parent_code is null)
    or (level = 'operational_plan' and code ~ '^[0-9]{8}$' and parent_code = left(code, 4))
    or (level = 'activity' and code ~ '^[0-9]{12}$' and parent_code = left(code, 8))
  ),
  constraint plan_structure_master_data_name_not_blank check (length(trim(name_th)) > 0),
  unique (fiscal_year_id, level, code)
);

create table public.budget_expense_master_data (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  expenditure_budget text not null,
  expense_category text not null,
  expense_subcategory text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_expense_master_data_values_not_blank check (
    length(trim(expenditure_budget)) > 0
    and length(trim(expense_category)) > 0
    and length(trim(expense_subcategory)) > 0
  ),
  unique (fiscal_year_id, expenditure_budget, expense_category, expense_subcategory)
);

create index plan_structure_master_data_year_level_idx
  on public.plan_structure_master_data(fiscal_year_id, level, sort_order, code)
  where is_active;
create index budget_expense_master_data_year_idx
  on public.budget_expense_master_data(fiscal_year_id, sort_order)
  where is_active;

create trigger touch_plan_structure_master_data
  before update on public.plan_structure_master_data
  for each row execute function private.touch_timestamp();
create trigger touch_budget_expense_master_data
  before update on public.budget_expense_master_data
  for each row execute function private.touch_timestamp();

alter table public.plan_structure_master_data enable row level security;
alter table public.budget_expense_master_data enable row level security;

revoke all on table public.plan_structure_master_data, public.budget_expense_master_data
  from public, anon, authenticated;
grant select on table public.plan_structure_master_data, public.budget_expense_master_data
  to authenticated;
grant insert, update, delete on table public.plan_structure_master_data, public.budget_expense_master_data
  to authenticated;

create policy plan_structure_master_data_select
  on public.plan_structure_master_data for select to authenticated using (true);
create policy plan_structure_master_data_admin_insert
  on public.plan_structure_master_data for insert to authenticated
  with check (private.user_has_role('admin'));
create policy plan_structure_master_data_admin_update
  on public.plan_structure_master_data for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy plan_structure_master_data_admin_delete
  on public.plan_structure_master_data for delete to authenticated
  using (private.user_has_role('admin'));

create policy budget_expense_master_data_select
  on public.budget_expense_master_data for select to authenticated using (true);
create policy budget_expense_master_data_admin_insert
  on public.budget_expense_master_data for insert to authenticated
  with check (private.user_has_role('admin'));
create policy budget_expense_master_data_admin_update
  on public.budget_expense_master_data for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy budget_expense_master_data_admin_delete
  on public.budget_expense_master_data for delete to authenticated
  using (private.user_has_role('admin'));

insert into public.plan_structure_master_data (
  fiscal_year_id,
  level,
  code,
  name_th,
  parent_code,
  sort_order
)
select
  fiscal_year.id,
  seed.level::public.plan_structure_level,
  seed.code,
  seed.name_th,
  seed.parent_code,
  seed.sort_order
from public.fiscal_years fiscal_year
cross join (values
  ('output', '3101', 'ผลงานการให้บริการวิชาการ', null, 1),
  ('output', '2001', 'ผลงานวิจัยและนวัตกรรม', null, 2),
  ('output', '1002', 'ผู้สำเร็จการศึกษาด้านสังคมศาสตร์', null, 3),
  ('output', '5102', 'งานสนับสนุนผู้สำเร็จการศึกษาด้านสังคมศาสตร์', null, 4),
  ('output', '7001', 'รายการบุคลากรภาครัฐ', null, 5),
  ('operational_plan', '31013200', 'แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ', '3101', 1),
  ('operational_plan', '20011524', 'แผนพัฒนาพื้นที่ต้นแบบนวัตกรรมชุมชน Community Innovation Sandbox เพื่อการพัฒนาที่ยั่งยืน', '2001', 2),
  ('operational_plan', '10021023', 'แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์', '1002', 3),
  ('operational_plan', '51025200', 'แผนการบริหารองค์กรสู่ความเป็นเลิศพื้นฐาน', '5102', 4),
  ('operational_plan', '10021511', 'แผนพัฒนาหลักสูตรตอบโจทย์อุตสาหกรรมอนาคต/หลักสูตรนานาชาติ/หลักสูตรรูปแบบใหม่', '1002', 5),
  ('operational_plan', '20012522', 'แผนการแลกเปลี่ยนนักศึกษา บุคลากร และนักวิจัย ด้านวิจัยและนวัตกรรมระดับ ASEAN-Mekong และนานาชาติ', '2001', 6),
  ('operational_plan', '20011521', 'แผนเพิ่มผลงานวิจัยตีพิมพ์ในระดับนานาชาติที่มีคุณภาพสูง', '2001', 7),
  ('operational_plan', '51023511', 'แผนพัฒนาบุคลากรสายวิชาการให้มีทักษะด้านนวัตกรรม/การทำงานร่วมกับภาคอุตสาหกรรม ภาครัฐและชุมชน', '5102', 8),
  ('operational_plan', '51023512', 'แผนพัฒนาบุคลากรสายสนับสนุนให้มีทักษะด้านนวัตกรรมจากการทำงาน เทคโนโลยีดิจิทัล Data Analytics & AI', '5102', 9),
  ('operational_plan', '70011200', 'รายการค่าใช้จ่ายบุคลากรภาครัฐยกระดับคุณภาพการศึกษาและการเรียนรู้', '7001', 10),
  ('activity', '310132000001', 'โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ', '31013200', 1),
  ('activity', '310132000005', 'โครงการสำรวจและประเมินความพึงพอใจในการให้บริการขององค์กรปกครองส่วนท้องถิ่น', '31013200', 2),
  ('activity', '200115240001', 'โครงการส่งเสริม/ สนับสนุนการนำนวัตกรรมไปใช้ประโยชน์ในชุมชน เพื่อสร้างชุมชนต้นแบบ', '20011524', 3),
  ('activity', '100210230001', 'โครงการผลิตบัณฑิตระดับปริญญาตรี คณะรัฐศาสตร์', '10021023', 4),
  ('activity', '510252000001', 'โครงการบริหารและจัดการหน่วยงาน', '51025200', 5),
  ('activity', '100215110002', 'โครงการพัฒนาหลักสูตรนานาชาติ', '10021511', 6),
  ('activity', '100215110003', 'โครงการพัฒนาหลักสูตรรูปแบบใหม่', '10021511', 7),
  ('activity', '100215110004', 'โครงการพัฒนาทักษะภาษาอังกฤษ', '10021511', 8),
  ('activity', '100215110005', 'โครงการพัฒนาระบบบริหารจัดการ เพื่อส่งเสริมการเรียนรู้เชิงประสบการณ์และการทำงานร่วมกับภาคอุตสาหกรรม CWIE', '10021511', 9),
  ('activity', '200125220001', 'โครงการแลกเปลี่ยนนักศึกษา บุคลากร และนักวิจัยเพื่อสร้างสรรค์ผลงานวิจัยสากล', '20012522', 10),
  ('activity', '200115210001', 'โครงการพัฒนาระบบนิเวศเพื่อส่งเสริมการสร้างผลงานตีพิมพ์เพื่อยกระดับนานาชาติ', '20011521', 11),
  ('activity', '510235110001', 'โครงการเสริมสร้างทักษะและยกระดับสมรรถนะอาจารย์สู่การพัฒนานวัตกรรมร่วมกับภาคอุตสาหกรรม ภาครัฐ และชุมชน', '51023511', 12),
  ('activity', '510235120001', 'โครงการ Design Thinking Workshop & Innovation Bootcamp', '51023512', 13),
  ('activity', '700112000001', 'โครงการค่าใช้จ่ายบุคลากรภาครัฐยกระดับคุณภาพการศึกษาและการเรียนรู้', '70011200', 14),
  ('activity', '100210230002', 'โครงการผลิตบัณฑิตระดับปริญญาตรี สาขาวิชการปกครอง', '10021023', 15),
  ('activity', '100210230003', 'โครงการผลิตบัณฑิตระดับปริญญาตรี สาขารัฐประศาสนศาสตร์', '10021023', 16),
  ('activity', '100210230004', 'โครงการส่งเสริมและสนับสนุนกิจกรรมเสริมหลักสูตร', '10021023', 17),
  ('activity', '100210230007', 'โครงการจัดหาครุภัณฑ์เพื่อการผลิตบัณฑิต คณะรัฐศาสตร์', '10021023', 18),
  ('activity', '510252000003', 'โครงการพัฒนาคุณภาพองค์กรสู่ความเป็นเลิศ', '51025200', 19),
  ('activity', '510252000007', 'โครงการบริหารจัดการด้านสาธารณูปโภค', '51025200', 20),
  ('activity', '510252000009', 'โครงการค่าใช้จ่ายในการจ้างเหมาทำความสะอาด', '51025200', 21),
  ('activity', '510252000010', 'โครงการค่าใช้จ่ายในการจ้างเหมาปฏิบัติงาน', '51025200', 22),
  ('activity', '510252000024', 'โครงการพัฒนาบุคลากร', '51025200', 23),
  ('activity', '510252000120', 'โครงการเสริมสร้างความผูกพันต่อองค์กร', '51025200', 24),
  ('activity', '310132000004', 'โครงการบริการวิชาการกลุ่มศึกษาอินเดียแห่งมหาวิทยาลัยอุบลราชธานี', '31013200', 25),
  ('activity', '510252000179', 'โครงการปรับปรุงภายใน CONFERENCE HALL 38', '51025200', 26),
  ('activity', '510252000180', 'โครงการปรับปรุงภายในสำนักงานเลขานุการ คณะรัฐศาสตร์', '51025200', 27),
  ('activity', '510252000181', 'โครงการปรับปรุงภายใน CONFERENCE ROOM ชั้น 1 คณะรัฐศาสตร์', '51025200', 28),
  ('activity', '510252000182', 'โครงการปรับปรุงภายใน MEETING ROOM และห้องสโมสรนักศึกษา คณะรัฐศาสตร์', '51025200', 29),
  ('activity', '510252000183', 'โครงการปรับปรุงภูมิทัศน์ด้านหน้าอาคารและโถงลิฟท์ชั้น 1', '51025200', 30)
) as seed(level, code, name_th, parent_code, sort_order)
where fiscal_year.buddhist_year in (2570, 2571, 2572)
on conflict (fiscal_year_id, level, code) do update
set name_th = excluded.name_th,
    parent_code = excluded.parent_code,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.budget_expense_master_data (
  fiscal_year_id,
  expenditure_budget,
  expense_category,
  expense_subcategory,
  sort_order
)
select
  fiscal_year.id,
  seed.expenditure_budget,
  seed.expense_category,
  seed.expense_subcategory,
  seed.sort_order
from public.fiscal_years fiscal_year
cross join (values
  ('งบเงินอุดหนุน', 'เงินอุดหนุนทั่วไป-ค่าใช้จ่ายอุดหนุน', 'เงินอุดหนุนทั่วไป-ค่าใช้จ่ายอุดหนุน', 1),
  ('งบดำเนินงาน', 'ค่าใช้สอย', 'ค่าใช้สอยอื่น ๆ', 2),
  ('งบดำเนินงาน', 'ค่าตอบแทน', 'ค่าตอบแทนวิทยากร', 3),
  ('งบดำเนินงาน', 'ค่าวัสดุ', 'ค่าวัสดุอื่น', 4),
  ('งบรายจ่ายอื่น', 'งบรายจ่ายอื่น-ค่าใช้สอย', 'งบรายจ่ายอื่น-ค่าใช้สอย', 5),
  ('งบดำเนินงาน', 'ค่าตอบแทน', 'ค่าตอบแทนตามตำแหน่ง', 6),
  ('งบลงทุน', 'ครุภัณฑ์', 'ครุภัณฑ์คอมพิวเตอร์', 7),
  ('งบลงทุน', 'ครุภัณฑ์', 'ครุภัณฑ์สำนักงาน', 8),
  ('งบลงทุน', 'ครุภัณฑ์', 'ครุภัณฑ์โฆษณาและเผยแพร่', 9),
  ('งบดำเนินงาน', 'ค่าตอบแทน', 'ค่าใช้สอยอื่น ๆ', 10),
  ('งบเงินอุดหนุน', 'เงินอุดหนุนทั่วไป-ค่าจ้างพนักงาน', 'เงินอุดหนุนทั่วไป-ค่าจ้างพนักงาน', 11),
  ('งบดำเนินงาน', 'ค่าตอบแทน', 'ค่าตอบแทนพนักงาน', 12),
  ('งบดำเนินงาน', 'ค่าใช้สอย', 'ค่าซ่อมแซม/ปรับปรุง', 13),
  ('งบดำเนินงาน', 'ค่าตอบแทน', 'ค่าตอบแทนที่ปรึกษา', 14),
  ('งบดำเนินงาน', 'ค่าสาธารณูปโภค', 'ค่าไฟฟ้า', 15),
  ('งบดำเนินงาน', 'ค่าใช้สอย', 'ค่าจ้างทำความสะอาด', 16),
  ('งบดำเนินงาน', 'ค่าใช้สอย', 'ค่าจ้างเหมาบริการ', 17),
  ('งบลงทุน', 'ค่าสิ่งก่อสร้าง', 'สิ่งก่อสร้าง', 18)
) as seed(expenditure_budget, expense_category, expense_subcategory, sort_order)
where fiscal_year.buddhist_year in (2570, 2571, 2572)
on conflict (fiscal_year_id, expenditure_budget, expense_category, expense_subcategory) do update
set sort_order = excluded.sort_order,
    is_active = true;

create or replace function private.validate_plan_structure_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  structure_level public.plan_structure_level;
  code_key text;
  name_key text;
  selected_code text;
  selected_name text;
begin
  foreach structure_level in array array[
    'output'::public.plan_structure_level,
    'operational_plan'::public.plan_structure_level,
    'activity'::public.plan_structure_level
  ] loop
    code_key := case structure_level
      when 'output' then 'outputCode'
      when 'operational_plan' then 'operationalPlanCode'
      else 'activityCode'
    end;
    name_key := case structure_level
      when 'output' then 'outputName'
      when 'operational_plan' then 'operationalPlanName'
      else 'projectActivityName'
    end;
    selected_code := nullif(trim(new.proposal_details ->> code_key), '');
    selected_name := nullif(trim(new.proposal_details ->> name_key), '');

    if selected_code is not null or selected_name is not null then
      if not exists (
        select 1
        from public.plan_structure_master_data master
        where master.fiscal_year_id = new.fiscal_year_id
          and master.level = structure_level
          and master.is_active
          and (selected_code is null or master.code = selected_code)
          and (selected_name is null or master.name_th = selected_name)
          and (
            structure_level = 'output'
            or structure_level = 'operational_plan'
              and nullif(trim(new.proposal_details ->> 'outputCode'), '') is null
            or structure_level = 'operational_plan'
              and master.parent_code = nullif(trim(new.proposal_details ->> 'outputCode'), '')
            or structure_level = 'activity'
              and nullif(trim(new.proposal_details ->> 'operationalPlanCode'), '') is null
            or structure_level = 'activity'
              and master.parent_code = nullif(trim(new.proposal_details ->> 'operationalPlanCode'), '')
          )
      ) then
        raise exception 'plan structure is not valid for the selected fiscal year'
          using errcode = '23514';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.validate_budget_expense_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expense_item jsonb;
  selected_budget text;
  selected_category text;
  selected_subcategory text;
begin
  if jsonb_typeof(new.proposal_details -> 'expenseItems') <> 'array' then
    return new;
  end if;

  for expense_item in select value from jsonb_array_elements(new.proposal_details -> 'expenseItems')
  loop
    selected_budget := nullif(trim(expense_item ->> 'expenditureBudget'), '');
    selected_category := nullif(trim(expense_item ->> 'expenseCategory'), '');
    selected_subcategory := nullif(trim(expense_item ->> 'expenseSubcategory'), '');
    if selected_budget is not null and selected_category is not null and selected_subcategory is not null
      and not exists (
        select 1
        from public.budget_expense_master_data master
        where master.fiscal_year_id = new.fiscal_year_id
          and master.is_active
          and master.expenditure_budget = selected_budget
          and master.expense_category = selected_category
          and master.expense_subcategory = selected_subcategory
      ) then
      raise exception 'expense category is not valid for the selected fiscal year'
        using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.validate_plan_structure_reference() from public, anon, authenticated;
revoke all on function private.validate_budget_expense_reference() from public, anon, authenticated;

create trigger validate_budget_request_plan_structure
  before insert or update of fiscal_year_id, proposal_details on public.budget_requests
  for each row execute function private.validate_plan_structure_reference();
create trigger validate_project_plan_structure
  before insert or update of fiscal_year_id, proposal_details on public.projects
  for each row execute function private.validate_plan_structure_reference();
create trigger validate_budget_request_expense_reference
  before insert or update of fiscal_year_id, proposal_details on public.budget_requests
  for each row execute function private.validate_budget_expense_reference();

commit;
