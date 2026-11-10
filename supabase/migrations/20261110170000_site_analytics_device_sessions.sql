alter table public.site_analytics_daily
  add column if not exists device text not null default 'unknown';

alter table public.site_analytics_daily
  drop constraint if exists site_analytics_daily_pkey;

alter table public.site_analytics_daily
  add constraint site_analytics_daily_pkey primary key (day, source, page, device);

create index if not exists site_analytics_daily_source_device_day_idx
  on public.site_analytics_daily (source, device, day desc);

create or replace function public.track_site_visit(p_source text, p_page text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source not in ('direct', 'organic_search', 'instagram', 'facebook', 'other_social', 'referral') then
    raise exception 'Invalid traffic source';
  end if;
  if p_device not in ('mobile', 'desktop', 'unknown') then
    raise exception 'Invalid device category';
  end if;
  if p_page is null or length(p_page) > 100 or p_page !~ '^/[A-Za-z0-9/_.-]*$' then
    raise exception 'Invalid page path';
  end if;

  insert into public.site_analytics_daily (day, source, page, device, views)
  values (current_date, p_source, p_page, p_device, 1)
  on conflict (day, source, page, device)
  do update set views = public.site_analytics_daily.views + 1;
end;
$$;

revoke all on function public.track_site_visit(text, text, text) from public, anon, authenticated;
grant execute on function public.track_site_visit(text, text, text) to service_role;
