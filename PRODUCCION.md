# Produccion Kora / Cora3D

## Archivos que van al hosting

Sube todo el contenido del proyecto al hosting de `www.cora3d.co`, incluyendo:

- `index.html`
- `mascotas.html`
- `llaveros.html`
- `hazlotumismo.html`
- `producto.html`
- `nosotros.html`
- `contacto.html`
- `checkout-resultado.html`
- `styles.css`
- todos los `.js`
- carpeta `assets/`
- carpeta `data/`
- `server.mjs` si el hosting permite Node.js

## Repositorio de productos

La fuente principal del catalogo es:

```txt
data/products.json
```

Cada producto usa esta estructura:

```json
{
  "id": "dije-corazon-rojo",
  "title": "Dije corazon rojo",
  "category": "Dijes",
  "image": "assets/image-12.png",
  "description": "Descripcion breve del producto.",
  "size": "30x34 mm",
  "price": 18000,
  "compareAt": 24000,
  "stock": 18
}
```

Tambien existe un editor privado:

```txt
admin-productos.html?key=TU_CLAVE_PRIVADA
```

Si el hosting no ejecuta Node.js, el editor funciona en modo local: editas, exportas `products.json` y lo vuelves a subir por FileZilla a `data/products.json`.

## Variables privadas

Copia `.env.example` como `.env` en el servidor donde corra `server.mjs` y llena estos valores:

```txt
KORA_PRIVATE_KEY=
KORA_SITE_URL=https://www.cora3d.co

WOMPI_PUBLIC_KEY=
WOMPI_INTEGRITY_SECRET=
WOMPI_EVENTS_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CONTACT_TABLE=contact_requests
SUPABASE_PET_TABLE=pet_requests
SUPABASE_ORDERS_TABLE=orders
```

No subas `.env` a repositorios publicos.

## Wompi

El checkout usa Web Checkout de Wompi:

1. El carrito envia los productos a `/api/checkout/wompi`.
2. El backend valida precios desde `data/products.json`.
3. El backend crea una orden en `data/orders.json`.
4. El backend genera la firma de integridad.
5. El usuario es enviado a Wompi para pagar.

Configura en Wompi esta URL de eventos:

```txt
https://www.cora3d.co/api/wompi/webhook
```

La pagina de retorno es:

```txt
https://www.cora3d.co/checkout-resultado.html
```

Importante: la aprobacion real del pago se confirma por webhook, no por la pagina de retorno.

## Supabase

El backend intenta guardar automaticamente:

- Contacto y cotizaciones en `contact_requests`
- Solicitudes de mascotas en `pet_requests`
- Ordenes de tienda en `orders`

Si ya tienes automatizaciones de correo en Supabase, conecta esas automatizaciones a esas tablas o cambia los nombres con las variables `SUPABASE_*_TABLE`.

## Bajo costo recomendado

Para salir rapido:

1. Hosting actual para HTML, CSS, JS y assets.
2. Backend pequeno Node.js en un servicio barato o gratuito si el hosting no soporta Node.
3. Supabase free tier para guardar leads y ordenes.
4. Wompi Web Checkout para pagos.
5. Envio inicialmente manual o tarifa fija desde `KORA_SHIPPING_FLAT_COP`.

