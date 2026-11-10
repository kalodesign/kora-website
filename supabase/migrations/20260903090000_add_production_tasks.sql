create table if not exists public.production_tasks (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  customer_name text,
  order_reference text,
  due_date date,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  reference_image_path text,
  reference_image_name text,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists production_tasks_status_idx on public.production_tasks (status, due_date, created_at desc);

alter table public.production_tasks enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-references', 'task-references', false, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
