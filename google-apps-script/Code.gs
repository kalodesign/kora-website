// Cambia este token por una cadena larga y privada antes de publicar el script.
const WEBHOOK_TOKEN = "REEMPLAZA_ESTE_TOKEN_LARGO";
const NOTIFICATION_EMAIL = "info@kora3d.co";

function doGet(event) {
  return jsonResponse({ ok: event.parameter.token === WEBHOOK_TOKEN });
}

function doPost(event) {
  if (event.parameter.token !== WEBHOOK_TOKEN) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (!payload.subject || !payload.text) {
      return jsonResponse({ ok: false, error: "Solicitud incompleta" });
    }

    const cache = CacheService.getScriptCache();
    const key = String(payload.idempotencyKey || "");
    if (key && cache.get(key)) return jsonResponse({ ok: true, duplicate: true });

    const message = {
      to: NOTIFICATION_EMAIL,
      subject: String(payload.subject),
      body: String(payload.text),
      htmlBody: String(payload.html || payload.text),
      name: "Kora"
    };
    if (payload.replyTo) message.replyTo = String(payload.replyTo);
    MailApp.sendEmail(message);

    if (key) cache.put(key, "sent", 21600);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
