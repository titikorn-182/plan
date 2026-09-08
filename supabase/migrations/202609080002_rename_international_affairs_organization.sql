begin;

update public.organizations
set
  name_th = 'สำนักงานเลขานุการ-งานกิจการนานาชาติ',
  updated_at = now()
where code = 'SEC-INTERNATIONAL'
   or name_th = 'สำนักงานเลขานุการ-งานวิเทศนานาชาติ';

commit;
