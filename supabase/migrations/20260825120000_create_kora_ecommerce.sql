create table if not exists contact_requests (
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  company text,
  project_type text,
  quantity text,
  budget text,
  details text,
  reference jsonb
);

create table if not exists pet_requests (
  id text primary key,
  created_at timestamptz default now(),
  client_name text not null,
  pet_name text not null,
  pet_type text not null,
  pet_color text,
  details text,
  photo jsonb
);

create table if not exists orders (
  id text primary key,
  reference text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz,
  status text not null default 'PENDING',
  currency text not null default 'COP',
  subtotal integer not null,
  shipping integer not null default 0,
  total integer not null,
  amount_in_cents integer not null,
  items jsonb not null,
  customer jsonb not null,
  payment_provider text,
  wompi_transaction_id text,
  wompi_payment_method text
);

create index if not exists contact_requests_created_at_idx on contact_requests (created_at desc);
create index if not exists pet_requests_created_at_idx on pet_requests (created_at desc);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);

alter table contact_requests enable row level security;
alter table pet_requests enable row level security;
alter table orders enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-references',
  'contact-references',
  false,
  15728640,
  array['image/png', 'image/jpeg', 'application/pdf', 'model/stl', 'application/sla', 'text/plain', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos',
  'pet-photos',
  false,
  15728640,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
