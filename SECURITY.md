# Seguridad de Kora

## Acciones inmediatas

1. Cambia o revoca el token anterior de Google Apps Script. El archivo local que lo contenía fue vaciado, pero el token antiguo ya debe considerarse comprometido.
2. Configura el nuevo valor únicamente como secreto de Supabase:

```powershell
npx supabase secrets set KORA_SHEETS_WEBHOOK_URL="URL_CON_TOKEN_NUEVO"
```

3. No subas `.env`, archivos `*.env`, llaves, certificados ni secretos al hosting o a GitHub.
4. Si alguna clave de Wompi, Resend, Supabase o Google fue compartida fuera de su proveedor, revócala y genera otra.

## Secretos de producción

Los siguientes valores deben vivir solo en Supabase Secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_EVENTS_SECRET`
- `RESEND_API_KEY`
- `KORA_SHEETS_WEBHOOK_URL`
- `KORA_ADMIN_EMAILS`
- `ENVIA_API_TOKEN`

La clave `publishable/anon` de `config.js` puede estar en el navegador. Nunca pongas allí una `service_role`, una clave privada de Wompi o una API key de correo.

## Límites y control de costos

Las funciones públicas tienen límites básicos por IP y tamaño de solicitud. Son una barrera inicial, no un sustituto de un WAF o CAPTCHA. En producción se recomienda activar Cloudflare Turnstile o una protección equivalente en formularios y checkout.

Configura también límites de gasto y alertas en:

- Supabase: uso de funciones, base de datos y Storage.
- Envia: consumo de cotizaciones y envíos.
- Resend: límite diario y alertas.
- Google Apps Script: cuotas de ejecución y correo.
- Wompi: ambiente Sandbox hasta completar las pruebas.

## Publicación segura

El workflow de GitHub Pages excluye archivos privados, Supabase, scripts internos y secretos. Antes de hacer push, revisa:

```powershell
git status --short
git diff --check
git grep -n -I -E "service_role|sk_live_|re_[A-Za-z0-9]{12,}|BEGIN .* PRIVATE KEY|token=" -- ':!*.md'
```

No publiques archivos de pedidos, exportaciones de clientes ni copias de bases de datos.

## Revisión mensual

- Revisa los logs de Edge Functions.
- Elimina archivos personales antiguos de Storage.
- Comprueba los usuarios autorizados en Supabase Auth.
- Revisa `KORA_ADMIN_EMAILS` y elimina cuentas que ya no administren la tienda.
- Rota tokens de integraciones cada 90 días o inmediatamente después de una sospecha.
- Mantén Wompi en Sandbox durante cualquier cambio de checkout.

