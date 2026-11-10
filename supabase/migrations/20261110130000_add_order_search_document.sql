alter table public.orders
  add column if not exists search_document text generated always as (
    lower(
      coalesce(reference, '') || ' ' ||
      coalesce(customer ->> 'name', '') || ' ' ||
      coalesce(customer ->> 'email', '') || ' ' ||
      coalesce(items::text, '')
    )
  ) stored;

create index if not exists orders_search_document_idx
  on public.orders using gin (search_document gin_trgm_ops);
