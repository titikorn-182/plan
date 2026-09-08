begin;

-- หน่วยงานเจ้าของคำขอตามโครงสร้างคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี
with desired (code, name_th, organization_type) as (
  values
    ('SEC-ADMIN', 'สำนักงานเลขานุการ-งานสารบรรณและธุรการ', 'secretariat_division'),
    ('SEC-VEHICLE', 'สำนักงานเลขานุการ-งานยานพาหนะ', 'secretariat_division'),
    ('SEC-FACILITY', 'สำนักงานเลขานุการ-งานอาคารสถานที่', 'secretariat_division'),
    ('SEC-INTERNATIONAL', 'สำนักงานเลขานุการ-งานวิเทศนานาชาติ', 'secretariat_division'),
    ('SEC-ACADEMIC', 'สำนักงานเลขานุการ-งานวิชาการและหลักสูตร', 'secretariat_division'),
    ('SEC-STUDENT', 'สำนักงานเลขานุการ-งานพัฒนานักศึกษาและศิษย์เก่า', 'secretariat_division'),
    ('SEC-FINANCE', 'สำนักงานเลขานุการ-งานการเงิน', 'secretariat_division'),
    ('SEC-ACCOUNTING', 'สำนักงานเลขานุการ-งานบัญชี', 'secretariat_division'),
    ('SEC-PROCUREMENT', 'สำนักงานเลขานุการ-งานพัสดุ', 'secretariat_division'),
    ('SEC-PLANNING', 'สำนักงานเลขานุการ-งานแผนและงบประมาณ', 'secretariat_division'),
    ('SEC-HR', 'สำนักงานเลขานุการ-งานบริหารบุคคล', 'secretariat_division'),
    ('SEC-RESEARCH', 'สำนักงานเลขานุการ-งานส่งเสริมการวิจัย', 'secretariat_division'),
    ('SEC-ACADEMIC-SERVICE', 'สำนักงานเลขานุการ-งานบริการวิชาการและการตลาด', 'secretariat_division'),
    ('DEPT-POL-IR', 'ภาควิชาการเมืองและความสัมพันธ์ระหว่างประเทศ', 'department'),
    ('DEPT-PA', 'ภาควิชารัฐประศาสนศาสตร์', 'department')
)
update public.organizations as organization
set
  organization_type = desired.organization_type,
  is_active = true,
  updated_at = now()
from desired
where organization.name_th = desired.name_th;

with desired (code, name_th, organization_type) as (
  values
    ('SEC-ADMIN', 'สำนักงานเลขานุการ-งานสารบรรณและธุรการ', 'secretariat_division'),
    ('SEC-VEHICLE', 'สำนักงานเลขานุการ-งานยานพาหนะ', 'secretariat_division'),
    ('SEC-FACILITY', 'สำนักงานเลขานุการ-งานอาคารสถานที่', 'secretariat_division'),
    ('SEC-INTERNATIONAL', 'สำนักงานเลขานุการ-งานวิเทศนานาชาติ', 'secretariat_division'),
    ('SEC-ACADEMIC', 'สำนักงานเลขานุการ-งานวิชาการและหลักสูตร', 'secretariat_division'),
    ('SEC-STUDENT', 'สำนักงานเลขานุการ-งานพัฒนานักศึกษาและศิษย์เก่า', 'secretariat_division'),
    ('SEC-FINANCE', 'สำนักงานเลขานุการ-งานการเงิน', 'secretariat_division'),
    ('SEC-ACCOUNTING', 'สำนักงานเลขานุการ-งานบัญชี', 'secretariat_division'),
    ('SEC-PROCUREMENT', 'สำนักงานเลขานุการ-งานพัสดุ', 'secretariat_division'),
    ('SEC-PLANNING', 'สำนักงานเลขานุการ-งานแผนและงบประมาณ', 'secretariat_division'),
    ('SEC-HR', 'สำนักงานเลขานุการ-งานบริหารบุคคล', 'secretariat_division'),
    ('SEC-RESEARCH', 'สำนักงานเลขานุการ-งานส่งเสริมการวิจัย', 'secretariat_division'),
    ('SEC-ACADEMIC-SERVICE', 'สำนักงานเลขานุการ-งานบริการวิชาการและการตลาด', 'secretariat_division'),
    ('DEPT-POL-IR', 'ภาควิชาการเมืองและความสัมพันธ์ระหว่างประเทศ', 'department'),
    ('DEPT-PA', 'ภาควิชารัฐประศาสนศาสตร์', 'department')
)
insert into public.organizations (code, name_th, organization_type, is_active)
select desired.code, desired.name_th, desired.organization_type, true
from desired
where not exists (
  select 1
  from public.organizations as organization
  where organization.name_th = desired.name_th
)
on conflict (code) do update
set
  name_th = excluded.name_th,
  organization_type = excluded.organization_type,
  is_active = true,
  updated_at = now();

commit;
