create extension if not exists pg_trgm with schema extensions;

alter table public.orders
  add column if not exists search_document text generated always as (
    lower(
      coalesce(reference, '') || ' ' ||
      coalesce(customer ->> 'name', '') || ' ' ||
      coalesce(customer ->> 'email', '') || ' ' ||
      coalesce(items::text, '')
    )
  ) stored;

do $$
declare
  opclass_schema text;
begin
  select n.nspname into opclass_schema
  from pg_opclass oc
  join pg_namespace n on n.oid = oc.opcnamespace
  join pg_am am on am.oid = oc.opcmethod
  where oc.opcname = 'gin_trgm_ops' and am.amname = 'gin'
  limit 1;

  if opclass_schema is null then
    raise exception 'pg_trgm no instaló gin_trgm_ops; revisa la extensión pg_trgm';
  end if;

  execute format(
    'create index if not exists orders_search_document_idx on public.orders using gin (search_document %I.gin_trgm_ops)',
    opclass_schema
  );
end $$;
