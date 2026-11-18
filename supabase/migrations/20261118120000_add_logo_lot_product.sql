alter table public.store_products add column if not exists price_tiers jsonb not null default '[]';
alter table public.store_products add column if not exists customization jsonb;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('order-logos','order-logos',false,512000,array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
insert into public.store_products (id,title,category,product_type,image,images,description,size,material,price,stock,is_active,tags,price_tiers,customization)
values ('llavero-esmalte-logo','Llavero esmalte con tu logo','Personalizados','dije','assets/esmalte-logo-1.webp',array['assets/esmalte-logo-1.webp','assets/esmalte-logo-2.webp'],
'Tu marca siempre a mano. Llavero con forma de esmalte, impreso en 3D y personalizado con tu logo. Un detalle ideal para salones de belleza, manicuristas y regalos de marca. Cada lote utiliza un único logo. Fabricación bajo pedido.','Consultar medidas','PLA',15000,100,true,array['Personalizable','Logo','Belleza','Llavero'],
'[{"quantity":1,"price":15000},{"quantity":12,"price":10000},{"quantity":20,"price":7000}]','{"type":"logo"}')
on conflict (id) do update set title=excluded.title,description=excluded.description,image=excluded.image,images=excluded.images,price=excluded.price,price_tiers=excluded.price_tiers,customization=excluded.customization;
