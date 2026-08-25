# Produccion Kora / Cora3D

La arquitectura de produccion queda separada en dos partes:

- `www.cora3d.co` en cPanel sirve HTML, CSS, JavaScript, imagenes y el catalogo.
- Supabase ejecuta formularios, archivos, ordenes y la confirmacion de Wompi.

No se necesita Render ni un proceso Node encendido. `server.mjs` se conserva para desarrollo local.

## 1. Crear la base de datos y Storage

1. Entra a tu proyecto de Supabase.
2. Abre `SQL Editor` y crea una consulta nueva.
3. Copia y ejecuta todo el archivo `supabase-schema.sql`.
4. En `Table Editor` deben aparecer `contact_requests`, `pet_requests` y `orders`.
5. En `Storage` deben aparecer los buckets privados `contact-references` y `pet-photos`.

Las tablas tienen RLS activado y no exponen datos al navegador. Las funciones usan la llave privada que Supabase inyecta en su propio entorno.

## 2. Vincular y publicar las funciones

Instala Supabase CLI una vez. En PowerShell, dentro de la carpeta del proyecto:

```powershell
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
```

El `project ref` es el identificador de tu proyecto. Aparece en la URL:

```txt
https://TU_PROJECT_REF.supabase.co
```

Configura los secretos de prueba de Wompi. No escribas estas llaves en ningun archivo del sitio:

```powershell
npx supabase secrets set WOMPI_PUBLIC_KEY=pub_test_TU_LLAVE
npx supabase secrets set WOMPI_INTEGRITY_SECRET=test_integrity_TU_SECRETO
npx supabase secrets set WOMPI_EVENTS_SECRET=test_events_TU_SECRETO
npx supabase secrets set KORA_SITE_URL=https://www.cora3d.co
npx supabase secrets set KORA_PRODUCTS_URL=https://www.cora3d.co/data/products.json
npx supabase secrets set KORA_ALLOWED_ORIGINS=https://www.cora3d.co,https://cora3d.co
npx supabase secrets set KORA_FREE_SHIPPING_FROM_COP=50000
npx supabase secrets set KORA_SHIPPING_FLAT_COP=0
```

Publica las cuatro funciones:

```powershell
npx supabase functions deploy contact --use-api
npx supabase functions deploy pet-request --use-api
npx supabase functions deploy checkout-wompi --use-api
npx supabase functions deploy wompi-webhook --use-api
```

`supabase/config.toml` ya indica que estas funciones reciben solicitudes publicas. Los formularios validan el origen y el webhook valida criptograficamente cada evento de Wompi.

## 3. Conectar el sitio de cPanel

Abre `config.js` y cambia una sola linea:

```js
supabaseFunctionsUrl: "https://TU_PROJECT_REF.supabase.co/functions/v1"
```

Sube por FileZilla a la raiz publica:

- `config.js`
- `script.js`
- `contact.js`
- todos los `.html` modificados

No subas la carpeta `supabase/`, `supabase-schema.sql`, `.env` ni secretos a cPanel. Esos archivos son de configuracion y desarrollo.

## 4. Configurar Wompi Sandbox

En el panel de Wompi usa primero las llaves de pruebas y registra como URL de eventos:

```txt
https://TU_PROJECT_REF.supabase.co/functions/v1/wompi-webhook
```

El retorno del comprador ya queda configurado como:

```txt
https://www.cora3d.co/checkout-resultado.html
```

La pagina de retorno no aprueba una compra. Solo el webhook firmado de Wompi puede cambiar el estado guardado en `orders`.

## 5. Probar antes de recibir dinero

Haz las pruebas en este orden:

1. Abre `contacto.html`, envia una cotizacion y confirma una fila en `contact_requests`.
2. Abre `mascotas.html`, envia el formulario con foto y confirma la fila y el archivo privado en `pet-photos`.
3. Agrega un producto, completa el checkout y confirma una orden `PENDING` en `orders`.
4. Paga con un medio Sandbox de Wompi.
5. Confirma que esa misma orden cambia a `APPROVED`, `DECLINED` o el estado enviado por Wompi.
6. Revisa `Edge Functions > Logs` si alguna prueba falla.

No cambies a llaves `pub_prod_`, `prod_integrity_` y `prod_events_` hasta completar las seis pruebas.

## 6. Notificacion por correo

La nueva solicitud se inserta en `pet_requests`, igual que la integracion anterior. Si tu automatizacion de correo ya escucha esa tabla, volvera a ejecutarse al recibir una fila.

Para comprobarla, envia una solicitud y revisa `Database > Webhooks` o la automatizacion que tenias creada. Si estaba conectada a otra tabla, cambia el evento a `INSERT` sobre `public.pet_requests`. El correo no debe depender del navegador: debe activarse desde esa insercion en Supabase.

## Catalogo de productos

La fuente de productos sigue siendo:

```txt
data/products.json
```

Cuando cambies productos, sube ese archivo por FileZilla. El checkout vuelve a consultar el catalogo y calcula precios del lado seguro; no confia en el precio que manda el navegador.

El editor `admin-productos.html` puede exportar el JSON, pero no debe publicarse como panel de administracion hasta agregar autenticacion real.
