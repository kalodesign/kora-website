alter table public.store_products
  add column if not exists images text[] not null default '{}';

update public.store_products
set images = array[image]
where coalesce(array_length(images, 1), 0) = 0;
