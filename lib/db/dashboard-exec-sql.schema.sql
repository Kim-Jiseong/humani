-- Read-only ad-hoc SQL runner for the dashboard. MANUAL migration: apply in the
-- Supabase SQL Editor. Additive + idempotent.
--
-- SAFETY: this file creates ONE function and adjusts its grants. It contains NO
-- drop table / truncate / delete / alter table / create table. Existing
-- experiment data is never touched by applying (or re-applying) this file.
--
-- SECURITY MODEL (read carefully):
--   * SECURITY INVOKER: runs as the CALLER. EXECUTE is granted ONLY to
--     service_role, so this RPC is unreachable with the anon / publishable key.
--     The dashboard API route calls it with the server-only service-role key.
--   * The REAL read-only guarantee is `set local transaction_read_only = on`:
--     PostgREST runs each RPC in its own transaction, so the engine rejects ANY
--     write / DDL with SQLSTATE 25006 regardless of the input string.
--   * statement_timeout + an outer LIMIT bound runaway / huge result sets.
--   * The string checks below are UX / defense-in-depth ONLY — NOT the security
--     boundary (comments / casing / dollar-quoting can evade them).
--
-- EXPOSURE WARNING: `/dashboard` is OPEN (no auth, by request). Anyone with the
-- URL can run SELECTs against ANY table here, including `select * from
-- auth.users` (participant emails / PII). Do not treat the deployed URL as
-- secret. search_path is NOT a control — schema-qualified reads still work.

create or replace function public.exec_read_sql(query text)
returns jsonb
language plpgsql
security invoker
set search_path = 'public'   -- usability: user queries need not schema-qualify.
as $$                        -- Stricter alt: set search_path = '' (forces public.<t>).
declare
  trimmed text := btrim(query);
  lowered text;
  result  jsonb;
begin
  trimmed := regexp_replace(trimmed, ';\s*$', '');   -- drop one trailing ;
  lowered := lower(trimmed);

  if trimmed = '' then
    return jsonb_build_object('error', 'Empty query', 'code', 'EMPTY');
  end if;
  if lowered !~ '^(select|with)\s' then
    return jsonb_build_object('error', 'Only SELECT / WITH queries are allowed', 'code', 'NOTREAD');
  end if;
  if position(';' in trimmed) > 0 then
    return jsonb_build_object('error', 'Multiple statements are not allowed', 'code', 'MULTI');
  end if;
  if lowered ~ '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|vacuum|call|do|reindex|cluster|comment|lock|merge)\M' then
    return jsonb_build_object('error', 'Write / DDL keywords are not allowed', 'code', 'WRITE');
  end if;

  set local transaction_read_only = on;   -- engine-level read-only (the real guard)
  set local statement_timeout = '5s';

  begin
    execute
      'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from (' ||
      trimmed ||
      ') _q limit 5000) t'
    into result;
  exception when others then
    return jsonb_build_object('error', SQLERRM, 'code', SQLSTATE);
  end;

  return jsonb_build_object(
    'rows', coalesce(result, '[]'::jsonb),
    'rowCount', jsonb_array_length(coalesce(result, '[]'::jsonb))
  );
end;
$$;

revoke all on function public.exec_read_sql(text) from public;
revoke all on function public.exec_read_sql(text) from anon;
revoke all on function public.exec_read_sql(text) from authenticated;
grant execute on function public.exec_read_sql(text) to service_role;
