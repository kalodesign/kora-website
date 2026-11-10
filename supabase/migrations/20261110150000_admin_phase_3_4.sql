create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles" on public.profiles for select to authenticated using (public.is_admin());
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  previous_status text,
  new_status text not null check (new_status in ('pending','in_progress','ready','shipped','delivered','cancelled')),
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_created_idx on public.order_status_history (order_id, created_at desc);
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant all on public.order_status_history to service_role;

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;

create or replace function public.admin_order_metrics()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'new', count(*) filter (where coalesce(fulfillment_status,'pending') = 'pending'),
    'printing', count(*) filter (where fulfillment_status in ('in_progress','ready')),
    'delivered', count(*) filter (where fulfillment_status = 'delivered'),
    'cancelled', count(*) filter (where fulfillment_status = 'cancelled'),
    'revenue', coalesce(sum(total) filter (where fulfillment_status <> 'cancelled'),0)
  )
  from public.orders
  where created_at >= now() - interval '365 days'
$$;
revoke all on function public.admin_order_metrics() from public, anon, authenticated;
grant execute on function public.admin_order_metrics() to service_role;

create or replace function public.admin_update_order_status(p_order_id text, p_status text, p_changed_by uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare previous text;
begin
  if p_status not in ('pending','in_progress','ready','shipped','delivered','cancelled') then
    raise exception 'Estado de producción no válido';
  end if;
  select coalesce(fulfillment_status,'pending') into previous
    from public.orders where id::text = p_order_id for update;
  if not found then raise exception 'No se encontró el pedido'; end if;
  update public.orders set fulfillment_status = p_status, updated_at = now() where id::text = p_order_id;
  if previous is distinct from p_status then
    insert into public.order_status_history(order_id, previous_status, new_status, changed_by, note)
    values (p_order_id, previous, p_status, p_changed_by, nullif(left(coalesce(p_note,''),500),''));
  end if;
  return jsonb_build_object('order_id',p_order_id,'previous_status',previous,'new_status',p_status);
end $$;
revoke all on function public.admin_update_order_status(text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(text,text,uuid,text) to service_role;
