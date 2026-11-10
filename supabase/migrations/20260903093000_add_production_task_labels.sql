alter table public.production_tasks
  add column if not exists product_type text not null default 'personalized' check (product_type in ('personalized', 'pet')),
  add column if not exists payment_status text not null default 'due' check (payment_status in ('due', 'paid')),
  add column if not exists delivery_status text not null default 'shipping' check (delivery_status in ('shipping', 'cash_on_delivery'));

create index if not exists production_tasks_labels_idx
  on public.production_tasks (product_type, payment_status, delivery_status, status);
