create table if not exists public.whatsapp_orders (
  id text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  order_reference text unique not null,
  customer_name text not null,
  customer_phone text,
  payment_date date,
  payment_amount integer,
  payment_status text not null default 'review' check (payment_status in ('review', 'paid', 'due')),
  city text,
  product_size text not null default 'review' check (product_size in ('review', 'medium', 'large')),
  microphone text,
  design text not null default 'review' check (design in ('review', 'star', 'heart', 'square', 'none')),
  opening text,
  base_color text,
  body_color text,
  detail_color text,
  logo_file text,
  notes text,
  evidence text,
  source jsonb not null default '{}'::jsonb
);

create index if not exists whatsapp_orders_payment_date_idx on public.whatsapp_orders (payment_date desc);
create index if not exists whatsapp_orders_created_at_idx on public.whatsapp_orders (created_at desc);
alter table public.whatsapp_orders enable row level security;
