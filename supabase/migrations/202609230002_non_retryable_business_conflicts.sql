begin;

-- A stale version/non-editable record is a permanent business conflict, not a
-- PostgreSQL serialization failure. PostgREST 14 retries custom SQLSTATE 40001
-- indefinitely; PT409 returns HTTP 409 without retrying the transaction.
-- Keep the current deployed function bodies, signatures, settings and grants.
-- Only these two exact application RPC signatures are eligible for the patch.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $migration$
declare
  target_function regprocedure;
  function_definition text;
begin
  foreach target_function in array array[
    'public.save_budget_request_transaction(uuid,integer,uuid,uuid,uuid,text,text,text,text,text,numeric,jsonb,jsonb,boolean,text)'::regprocedure,
    'public.save_project_transaction(uuid,integer,uuid,uuid,uuid,text,text,text,text,numeric,numeric,date,date,jsonb,boolean,text)'::regprocedure
  ]
  loop
    function_definition := pg_get_functiondef(target_function);
    if strpos(function_definition, 'errcode = ''40001''') > 0 then
      execute replace(function_definition, 'errcode = ''40001''', 'errcode = ''PT409''');
    elsif strpos(function_definition, 'errcode = ''PT409''') = 0 then
      raise exception 'Expected business-conflict error code was not found in %', target_function;
    end if;
  end loop;
end;
$migration$;

commit;
