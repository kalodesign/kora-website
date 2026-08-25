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
