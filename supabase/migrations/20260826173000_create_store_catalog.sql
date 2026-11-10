create or replace function public.set_store_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists store_products (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  category text not null,
  product_type text not null default 'dije' check (product_type in ('dije', 'kit', 'a_medida')),
  image text not null,
  images text[] not null default '{}',
  description text not null,
  size text,
  price integer not null check (price >= 0),
  compare_at integer check (compare_at is null or compare_at >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  related_product_ids text[] not null default '{}',
  components jsonb not null default '[]'::jsonb,
  name_options integer[] not null default '{}',
  tags text[] not null default '{}'
);

create index if not exists store_products_active_idx on store_products (is_active, title);
create index if not exists store_products_type_idx on store_products (product_type);

alter table store_products enable row level security;

drop policy if exists "Public reads active store products" on store_products;
create policy "Public reads active store products"
  on store_products for select using (is_active = true);

drop trigger if exists store_products_set_updated_at on store_products;
create trigger store_products_set_updated_at
  before update on store_products
  for each row execute function public.set_store_products_updated_at();
