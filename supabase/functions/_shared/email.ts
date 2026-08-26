type EmailMessage = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};

export const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const formatCop = (value: unknown) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const sendKoraEmail = async (message: EmailMessage) => {
  try {
    const sent = await sendWithCpanelPhp(message);
    if (sent) return true;
  } catch (error) {
    console.error("cPanel email notification failed", error);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (apiKey) {
    try {
      const sent = await sendWithResend(apiKey, message);
      if (sent) return true;
    } catch (error) {
      console.error("Resend notification failed", error);
    }
  }

  return sendWithGoogleAppsScript(message);
};

const sendWithResend = async (apiKey: string, message: EmailMessage) => {
  const to = Deno.env.get("KORA_NOTIFICATION_EMAIL") || "info@kora3d.co";
  const from = Deno.env.get("KORA_EMAIL_FROM") || "Kora <notificaciones@kora3d.co>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Kora3D-Supabase/1.0",
      "Idempotency-Key": message.idempotencyKey
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
  return true;
};

const sendWithGoogleAppsScript = async (message: EmailMessage) => {
  const url = Deno.env.get("GOOGLE_APPS_SCRIPT_WEBHOOK_URL");
  if (!url) return false;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message)
  });
  if (!response.ok) throw new Error(`Google Apps Script ${response.status}`);

  const result = await response.json().catch(() => ({ ok: false }));
  if (!result.ok) throw new Error("Google Apps Script no pudo enviar el correo");
  return true;
};

const sendWithCpanelPhp = async (message: EmailMessage) => {
  const url = Deno.env.get("KORA_CPHP_NOTIFICATION_URL");
  if (!url) return false;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message)
  });
  if (!response.ok) throw new Error(`cPanel email endpoint ${response.status}`);

  const result = await response.json().catch(() => ({ ok: false }));
  if (!result.ok) throw new Error("cPanel no pudo enviar el correo");
  return true;
};

export const emailLayout = (title: string, content: string) => `
  <main style="font-family:Arial,sans-serif;color:#171D67;max-width:640px;margin:0 auto;padding:24px">
    <h1 style="font-size:24px;margin:0 0 20px">${escapeHtml(title)}</h1>
    <section style="background:#FFCFDB;padding:24px;border-radius:8px;color:#171D67">${content}</section>
  </main>
`;
