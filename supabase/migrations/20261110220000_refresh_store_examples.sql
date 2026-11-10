-- Keep a restricted snapshot before replacing the legacy catalog.
create schema if not exists kora_archive;
revoke all on schema kora_archive from public, anon, authenticated;
create table if not exists kora_archive.store_products_20261110 as
  select * from public.store_products;
revoke all on kora_archive.store_products_20261110 from public, anon, authenticated;
alter table kora_archive.store_products_20261110 enable row level security;

delete from public.store_products;

insert into public.store_products
  (id, title, category, product_type, image, images, description, size, material,
   price, compare_at, stock, is_active, related_product_ids, components,
   name_options, tags, color_mode, colors)
values
  ('galleta-clickleable', 'Galleta clickleable de chocolate', 'Antiestrés', 'dije',
   'assets/galleta-clickleable-1.png',
   array['assets/galleta-clickleable-1.png', 'assets/galleta-clickleable-2.jpg', 'assets/galleta-clickleable-3.png'],
   'Galleta antiestrés impresa en 3D con piezas clickleables.', 'Aprox. 45 × 40 mm', 'PLA',
   15000, null, 50, true, array['bola-nombre-personalizado'], '[]'::jsonb,
   array[]::integer[], array[]::text[], 'none', '[]'::jsonb),
  ('bola-nombre-personalizado', 'Bola navideña con nombre personalizado', 'Personalizados', 'a_medida',
   'assets/bola-nombre-personalizado-1.webp',
   array['assets/bola-nombre-personalizado-1.webp', 'assets/bola-nombre-personalizado-2.webp'],
   'Adorno navideño con el nombre que elijas, fabricado en impresión 3D.', 'Aprox. 9 cm', 'PLA',
   8500, null, 12, true, array['galleta-clickleable'], '[]'::jsonb,
   array[1,12]::integer[], array['Personalizable']::text[], 'none', '[]'::jsonb),
  ('dije-corazon-rojo', 'Dije corazón rojo', 'Dijes', 'dije',
   'assets/image-12.png', array['assets/image-12.png'],
   'Dije en forma de corazón para combinar con llaveros y accesorios.', '30 × 34 mm', 'PLA',
   18000, null, 18, true, array['kit-coqueta-rosada'], '[]'::jsonb,
   array[]::integer[], array[]::text[], 'none', '[]'::jsonb),
  ('kit-coqueta-rosada', 'Kit coqueta rosada', 'Kits', 'kit',
   'assets/llaveros-image-03.jpeg', array['assets/llaveros-image-03.jpeg'],
   'Kit de llavero personalizado con un dije de corazón rojo.', 'Personalizado', 'PLA',
   70000, null, 5, true, array['dije-corazon-rojo'],
   '[{"productId":"dije-corazon-rojo","quantity":1}]'::jsonb,
   array[]::integer[], array[]::text[], 'none', '[]'::jsonb);
