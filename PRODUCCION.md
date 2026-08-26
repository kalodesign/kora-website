# Produccion Kora / Cora3D

La arquitectura de produccion queda separada en dos partes:

- `kora3d.co` en cPanel sirve HTML, CSS, JavaScript, imagenes y el catalogo.
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
npx supabase link --project-ref hapveghsbqnhkeuraxow
```

El `project ref` es el identificador de tu proyecto. Aparece en la URL:

```txt
https://hapveghsbqnhkeuraxow.supabase.co
```

Configura los secretos de prueba de Wompi. No escribas estas llaves en ningun archivo del sitio:

```powershell
npx supabase secrets set WOMPI_PUBLIC_KEY=pub_test_TU_LLAVE
npx supabase secrets set WOMPI_INTEGRITY_SECRET=test_integrity_TU_SECRETO
npx supabase secrets set WOMPI_EVENTS_SECRET=test_events_TU_SECRETO
npx supabase secrets set KORA_SITE_URL=https://kora3d.co
npx supabase secrets set KORA_PRODUCTS_URL=https://kora3d.co/data/products.json
npx supabase secrets set KORA_ALLOWED_ORIGINS=https://kora3d.co,https://www.kora3d.co
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
supabaseFunctionsUrl: "https://hapveghsbqnhkeuraxow.supabase.co/functions/v1"
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
https://hapveghsbqnhkeuraxow.supabase.co/functions/v1/wompi-webhook
```

El retorno del comprador ya queda configurado como:

```txt
https://kora3d.co/checkout-resultado.html
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

## 6. Notificaciones por correo

Las funciones ya preparan copias internas para `info@kora3d.co` cuando ocurre cualquiera de estos eventos:

- Nueva cotizacion desde Contacto.
- Nueva solicitud de Mascotas.
- Nueva orden pendiente de pago.
- Cambio de estado enviado por Wompi, incluido `APPROVED`.

Para activarlas crea una cuenta en Resend, agrega y verifica el dominio `kora3d.co` en `Domains`, y crea una API key. Resend te mostrara registros DNS; agregalos desde la zona DNS de tu cPanel y espera la verificacion del dominio.

Una vez verificado, pega la llave solo en tu propia terminal:

```powershell
npx supabase secrets set RESEND_API_KEY=re_TU_LLAVE_PRIVADA
npx supabase secrets set KORA_NOTIFICATION_EMAIL=info@kora3d.co
npx supabase secrets set KORA_EMAIL_FROM="Kora <notificaciones@kora3d.co>"
```

No compartas `RESEND_API_KEY` por chat ni la agregues a FileZilla o GitHub. La configuracion permite responder directamente a la persona que envio Contacto u orden, y conserva fotos o archivos como privados en Supabase Storage.

### Alternativa gratuita: Google Apps Script

Si no quieres usar Resend al inicio, usa el archivo `google-apps-script/Code.gs`:

1. Entra a [script.google.com](https://script.google.com) con una cuenta de Google que pueda enviar correos.
2. Crea un proyecto, pega `Code.gs` y cambia `WEBHOOK_TOKEN` por una cadena larga y privada.
3. Pulsa `Deploy > New deployment > Web app`.
4. Selecciona ejecutar como tu cuenta y acceso para cualquiera con el enlace. Autoriza el permiso para enviar correo.
5. Copia la URL terminada en `/exec` y agrega `?token=EL_MISMO_TOKEN` al final.
6. Guarda esa URL completa como secreto de Supabase:

```powershell
npx supabase secrets set GOOGLE_APPS_SCRIPT_WEBHOOK_URL="https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec?token=TU_TOKEN_LARGO"
```

Este metodo envia a `info@kora3d.co` desde la cuenta de Google propietaria del script. Es adecuado para alertas internas de la version 1; no es un sustituto para correos masivos o de marketing.

### Alternativa directa desde cPanel

Puedes evitar proveedores externos y usar el correo del hosting. Sube `api/notify.php` por FileZilla a una carpeta publica `api/` en la raiz de `kora3d.co`.

1. En el archivo PHP cambia `REEMPLAZA_ESTE_TOKEN_LARGO` por una cadena larga y privada.
2. Confirma que `info@kora3d.co` existe como cuenta de correo en cPanel.
3. Guarda la misma URL con token como secreto de Supabase:

```powershell
npx supabase secrets set KORA_CPHP_NOTIFICATION_URL="https://kora3d.co/api/notify.php?token=TU_TOKEN_LARGO"
```

4. Prueba la URL en el navegador. Si el token coincide, debe devolver `{"ok":true}`.

La funcion de Supabase intentara enviar primero con este endpoint de cPanel, despues con Resend y por ultimo con Google Apps Script. Para usar solo cPanel, revoca la llave expuesta de Resend y no configures Google Apps Script.

## Catalogo y almacenamiento en version 1

Los productos continuan en `data/products.json` y las imagenes en `assets/`, alojados en tu hosting. No se suben al Storage de Supabase.

Supabase se usa solo para solicitudes, ordenes y sus archivos adjuntos. El plan Free incluye 1 GB de Storage, suficiente para una version inicial si mantienes fotos y referencias bajo control. Revisa Storage cada mes y elimina adjuntos antiguos cuando ya no los necesites.

## Catalogo de productos

La fuente de productos sigue siendo:

```txt
data/products.json
```

Cuando cambies productos, sube ese archivo por FileZilla. El checkout vuelve a consultar el catalogo y calcula precios del lado seguro; no confia en el precio que manda el navegador.

El editor `admin-productos.html` puede exportar el JSON, pero no debe publicarse como panel de administracion hasta agregar autenticacion real.
