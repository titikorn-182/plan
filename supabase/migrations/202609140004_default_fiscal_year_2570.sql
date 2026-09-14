begin;

update public.system_settings
set
  default_fiscal_year_id = fiscal_year.id,
  default_quarter = 1,
  updated_at = now()
from public.fiscal_years as fiscal_year
where
  public.system_settings.singleton = true
  and fiscal_year.buddhist_year = 2570
  and fiscal_year.status in ('open', 'closed');

commit;
