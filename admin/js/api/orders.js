import { getSupabase } from "../supabase.js";

export const PAGE_SIZE = 10;
async function request(view, params = {}, body) {
  const client = getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error("Inicia sesión para consultar los pedidos.");
  const endpoint = window.koraEndpoint?.("admin-business", "");
  if (!endpoint) throw new Error("No está configurado el servicio de administración.");
  const url = new URL(endpoint);
  if (view) url.searchParams.set("view", view);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${session.access_token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? "Tu sesión expiró o tu cuenta no tiene acceso al admin." : payload.error || "No se pudo completar la solicitud.");
  return payload;
}
export function getOrdersPage(filters = {}) {
  return request("orders", { page: filters.page || 1, pageSize: PAGE_SIZE, ...filters });
}
export async function getOrderMetrics() {
  const payload = await request("metrics");
  return payload.metrics || {};
}
export async function getOrderDetail(orderId) {
  return request("order-detail", { orderId });
}
export async function updateOrderStatus(orderId, status, note = "") {
  return request(null, {}, { action: "update-order-fulfillment", id: orderId, status, note });
}
