alter table public.store_products
  add column if not exists material text not null default '';
