alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending';

alter table public.orders
  drop constraint if exists orders_fulfillment_status_check;
alter table public.orders
  add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('pending', 'in_progress', 'ready', 'shipped', 'delivered', 'cancelled'));

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status, created_at desc);

create table if not exists public.site_home_categories (
  id text primary key check (id in ('mascotas', 'llaveros', 'dijes', 'proyectos')),
  title text not null,
  action_label text not null default 'Descubrir',
  image_url text not null,
  alt_text text not null,
  href text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.site_home_categories (id, title, action_label, image_url, alt_text, href, sort_order)
values
  ('mascotas', 'Mascotas', 'Descubrir', 'assets/mascotas-image-01-desktop.jpg', 'Llavero de mascota personalizado', 'mascotas.html', 1),
  ('llaveros', 'Llaveros', 'Descubrir', 'assets/llaveros-image-03-desktop.jpg', 'Llavero personalizado de Kora', 'llaveros.html', 2),
  ('dijes', 'Dijes', 'Descubrir', 'assets/image-08.png', 'Dije colorido de Kora', 'hazlotumismo.html', 3),
  ('proyectos', 'Proyectos', 'Hablemos', 'assets/image-05-desktop.jpg', 'Pieza personalizada para un proyecto', 'contacto.html', 4)
on conflict (id) do nothing;

alter table public.site_home_categories enable row level security;
drop policy if exists "Public reads active home categories" on public.site_home_categories;
create policy "Public reads active home categories"
  on public.site_home_categories for select using (is_active = true);

create table if not exists public.site_analytics_daily (
  day date not null,
  source text not null check (source in ('direct', 'organic_search', 'instagram', 'facebook', 'other_social', 'referral')),
  page text not null,
  views bigint not null default 0 check (views >= 0),
  primary key (day, source, page)
);

create index if not exists site_analytics_daily_day_idx
  on public.site_analytics_daily (day desc);
alter table public.site_analytics_daily enable row level security;

create or replace function public.track_site_visit(p_source text, p_page text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_analytics_daily (day, source, page, views)
  values (current_date, p_source, p_page, 1)
  on conflict (day, source, page)
  do update set views = public.site_analytics_daily.views + 1;
$$;

revoke all on function public.track_site_visit(text, text) from public, anon, authenticated;
grant execute on function public.track_site_visit(text, text) to service_role;
