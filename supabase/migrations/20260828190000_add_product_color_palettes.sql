alter table public.store_products
  add column if not exists color_mode text not null default 'none'
    check (color_mode in ('none', 'global', 'manual')),
  add column if not exists colors jsonb not null default '[]'::jsonb,
  add column if not exists sold_count integer not null default 0
    check (sold_count >= 0);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

insert into public.store_settings (key, value)
values ('global_colors', '[]'::jsonb)
on conflict (key) do nothing;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_store_products_updated_at();

create or replace function public.increment_store_product_sold(product_id text, quantity integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.store_products
  set sold_count = sold_count + greatest(quantity, 0)
  where id = product_id;
$$;
