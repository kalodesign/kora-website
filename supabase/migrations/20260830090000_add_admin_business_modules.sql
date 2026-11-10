create table if not exists public.site_banners (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  placement text not null default 'llaveros_hero',
  title text not null,
  desktop_image text not null,
  mobile_image text,
  alt_text text not null,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.finance_accounts (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bank_name text not null,
  account_alias text not null,
  account_last_four text check (account_last_four is null or account_last_four ~ '^[0-9]{4}$'),
  account_type text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.finance_entries (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null,
  amount integer not null check (amount > 0),
  occurred_on date not null default current_date,
  account_id text references public.finance_accounts(id) on delete set null,
  payment_method text,
  reference text,
  note text,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.store_quotes (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  quote_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected')),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  company text,
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0 check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null default 0 check (total >= 0),
  note text,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists site_banners_placement_idx on public.site_banners (placement, is_active, sort_order);
create index if not exists finance_entries_occurred_on_idx on public.finance_entries (occurred_on desc);
create index if not exists finance_entries_type_idx on public.finance_entries (entry_type, occurred_on desc);
create index if not exists store_quotes_status_idx on public.store_quotes (status, created_at desc);

alter table public.site_banners enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_entries enable row level security;
alter table public.store_quotes enable row level security;

drop policy if exists "Public reads active site banners" on public.site_banners;
create policy "Public reads active site banners"
  on public.site_banners for select using (is_active = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-banners', 'site-banners', true, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
