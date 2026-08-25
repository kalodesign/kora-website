import {
  getSupabaseAdmin,
  handleOptions,
  isAllowedBrowserOrigin,
  jsonResponse,
  sha256
} from "../_shared/http.ts";
import { emailLayout, escapeHtml, formatCop, sendKoraEmail } from "../_shared/email.ts";

type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  stock?: number;
};

const cleanText = (value: unknown, maxLength: number) => String(value || "").trim().slice(0, maxLength);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);

  try {
    const publicKey = Deno.env.get("WOMPI_PUBLIC_KEY");
    const integritySecret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
    const siteUrl = (Deno.env.get("KORA_SITE_URL") || "https://kora3d.co").replace(/\/$/, "");
    const productsUrl = Deno.env.get("KORA_PRODUCTS_URL") || `${siteUrl}/data/products.json`;
    if (!publicKey || !integritySecret) {
      return jsonResponse(request, { error: "Wompi no esta configurado todavia" }, 503);
    }

    const payload = await request.json();
    const cartItems = Array.isArray(payload.items) ? payload.items : [];
    const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : {};
    const customerEmail = cleanText(customer.email, 180).toLowerCase();
    if (!cartItems.length || !customerEmail.includes("@")) {
      return jsonResponse(request, { error: "Completa los datos del pedido" }, 400);
    }

    const productResponse = await fetch(productsUrl, { signal: AbortSignal.timeout(8000) });
    if (!productResponse.ok) throw new Error("No se pudo consultar el catalogo");
    const products = await productResponse.json() as CatalogProduct[];

    const items = cartItems.map((cartItem: { id?: string; qty?: number }) => {
      const product = products.find((item) => item.id === cartItem.id);
      if (!product || Number(product.price) <= 0 || Number(product.stock ?? 0) <= 0) return null;
      const qty = Math.max(1, Math.min(Math.floor(Number(cartItem.qty || 1)), Number(product.stock)));
      const unitPrice = Math.round(Number(product.price));
      return { id: product.id, title: product.title, qty, unitPrice, total: unitPrice * qty };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + (item?.total || 0), 0);
    const freeShippingFrom = Number(Deno.env.get("KORA_FREE_SHIPPING_FROM_COP") || 50000);
    const flatShipping = Number(Deno.env.get("KORA_SHIPPING_FLAT_COP") || 0);
    const shipping = subtotal >= freeShippingFrom ? 0 : flatShipping;
    const total = subtotal + shipping;
    if (!items.length || total <= 0) {
      return jsonResponse(request, { error: "El carrito no tiene productos validos" }, 400);
    }

    const id = crypto.randomUUID();
    const reference = `KORA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.slice(0, 8)}`.toUpperCase();
    const currency = "COP";
    const amountInCents = Math.round(total * 100);
    const integrity = await sha256(`${reference}${amountInCents}${currency}${integritySecret}`);
    const redirectUrl = `${siteUrl}/checkout-resultado.html?reference=${encodeURIComponent(reference)}`;
    const cleanCustomer = {
      name: cleanText(customer.name, 120),
      email: customerEmail,
      phone: cleanText(customer.phone, 40),
      address: cleanText(customer.address, 220),
      city: cleanText(customer.city, 100),
      region: cleanText(customer.region, 100),
      notes: cleanText(customer.notes, 1000)
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").insert({
      id,
      reference,
      status: "PENDING",
      currency,
      subtotal,
      shipping,
      total,
      amount_in_cents: amountInCents,
      items,
      customer: cleanCustomer,
      payment_provider: "wompi"
    });
    if (error) throw error;

    const itemLines = items.map((item) => `${item?.qty} x ${item?.title}: ${formatCop(item?.total)}`).join("\n");
    await sendKoraEmail({
      subject: `Nueva orden pendiente ${reference}`,
      replyTo: cleanCustomer.email,
      idempotencyKey: `order-${id}-created`,
      text: `Nueva orden pendiente de pago\nReferencia: ${reference}\nCliente: ${cleanCustomer.name}\nCorreo: ${cleanCustomer.email}\nCelular: ${cleanCustomer.phone}\nEntrega: ${cleanCustomer.address}, ${cleanCustomer.city}, ${cleanCustomer.region}\n\nProductos:\n${itemLines}\n\nTotal: ${formatCop(total)}`,
      html: emailLayout("Nueva orden pendiente de pago", `
        <p><strong>Referencia:</strong> ${escapeHtml(reference)}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(cleanCustomer.name)}<br>${escapeHtml(cleanCustomer.email)}<br>${escapeHtml(cleanCustomer.phone)}</p>
        <p><strong>Entrega:</strong> ${escapeHtml(`${cleanCustomer.address}, ${cleanCustomer.city}, ${cleanCustomer.region}`)}</p>
        <p><strong>Productos:</strong><br>${items.map((item) => `${escapeHtml(item?.qty)} x ${escapeHtml(item?.title)}: ${escapeHtml(formatCop(item?.total))}`).join("<br>")}</p>
        <p><strong>Total:</strong> ${escapeHtml(formatCop(total))}</p>
      `)
    }).catch((emailError) => console.error("order created email", emailError));

    return jsonResponse(request, {
      ok: true,
      checkoutUrl: "https://checkout.wompi.co/p/",
      publicKey,
      currency,
      amountInCents,
      reference,
      integrity,
      redirectUrl,
      customer: cleanCustomer
    }, 201);
  } catch (error) {
    console.error("checkout-wompi", error);
    return jsonResponse(request, { error: "No se pudo crear el checkout" }, 400);
  }
});
