import {
  getNestedValue,
  getSupabaseAdmin,
  handleOptions,
  jsonResponse,
  sha256
} from "../_shared/http.ts";
import { emailLayout, escapeHtml, formatCop, sendKoraEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);

  try {
    const eventSecret = Deno.env.get("WOMPI_EVENTS_SECRET");
    if (!eventSecret) return jsonResponse(request, { error: "Webhook no configurado" }, 503);

    const payload = await request.json();
    const properties = Array.isArray(payload.signature?.properties) ? payload.signature.properties : [];
    const incomingChecksum = String(
      request.headers.get("x-event-checksum") || payload.signature?.checksum || ""
    ).toLowerCase();
    if (!properties.length || !incomingChecksum) {
      return jsonResponse(request, { error: "Firma de evento ausente" }, 401);
    }

    const signatureSource = properties
      .map((property: string) => String(getNestedValue(payload.data, property)))
      .join("");
    const calculatedChecksum = await sha256(`${signatureSource}${payload.timestamp}${eventSecret}`);
    if (calculatedChecksum.toLowerCase() !== incomingChecksum) {
      return jsonResponse(request, { error: "Firma de evento invalida" }, 401);
    }

    const transaction = payload.data?.transaction;
    if (!transaction?.reference) return jsonResponse(request, { ok: true, ignored: true });

    const supabase = getSupabaseAdmin();
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("id, reference, status, amount_in_cents, currency, total, customer, items")
      .eq("reference", transaction.reference)
      .maybeSingle();
    if (readError) throw readError;
    if (!order) return jsonResponse(request, { ok: true, ignored: true });

    const amountMatches = Number(order.amount_in_cents) === Number(transaction.amount_in_cents);
    const currencyMatches = String(order.currency) === String(transaction.currency);
    if (!amountMatches || !currencyMatches) {
      console.error("Wompi amount mismatch", transaction.reference);
      return jsonResponse(request, { error: "Los datos del pago no coinciden con la orden" }, 409);
    }

    const { error: updateError } = await supabase.from("orders").update({
      status: String(transaction.status || order.status),
      wompi_transaction_id: String(transaction.id || ""),
      wompi_payment_method: String(transaction.payment_method_type || ""),
      updated_at: new Date().toISOString()
    }).eq("id", order.id);
    if (updateError) throw updateError;

    const customer = order.customer && typeof order.customer === "object"
      ? order.customer as Record<string, unknown>
      : {};
    const itemLines = Array.isArray(order.items)
      ? order.items.map((item: Record<string, unknown>) => `${item.qty} x ${item.title}`).join("\n")
      : "";
    const status = String(transaction.status || order.status);
    await sendKoraEmail({
      subject: `Pago ${status}: ${order.reference}`,
      replyTo: String(customer.email || ""),
      idempotencyKey: `wompi-${String(transaction.id || order.reference)}-${status}`,
      text: `Actualizacion de pago Wompi\nReferencia: ${order.reference}\nEstado: ${status}\nTransaccion: ${transaction.id || "No disponible"}\nCliente: ${customer.name || "No disponible"}\nProductos:\n${itemLines}\nTotal: ${formatCop(order.total)}`,
      html: emailLayout(`Pago ${status}`, `
        <p><strong>Referencia:</strong> ${escapeHtml(order.reference)}</p>
        <p><strong>Estado:</strong> ${escapeHtml(status)}</p>
        <p><strong>Transaccion Wompi:</strong> ${escapeHtml(transaction.id || "No disponible")}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(customer.name || "No disponible")}</p>
        <p><strong>Productos:</strong><br>${escapeHtml(itemLines).replaceAll("\n", "<br>")}</p>
        <p><strong>Total:</strong> ${escapeHtml(formatCop(order.total))}</p>
      `)
    }).catch((emailError) => console.error("wompi email", emailError));

    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("wompi-webhook", error);
    return jsonResponse(request, { error: "Evento invalido" }, 400);
  }
});
