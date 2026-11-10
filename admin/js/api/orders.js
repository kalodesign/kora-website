import { getSupabase } from "../supabase.js";

const PAGE_SIZE = 10;
export async function getOrdersPage(filters = {}) {
  const client = getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error("Inicia sesión para consultar los pedidos.");
  const endpoint = window.koraEndpoint?.("admin-business", "");
  if (!endpoint) throw new Error("No está configurado el servicio de administración.");
  const url = new URL(endpoint);
  url.searchParams.set("view", "orders");
  url.searchParams.set("page", String(filters.page || 1));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  for (const key of ["q", "tab", "status", "from", "to"]) if (filters[key]) url.searchParams.set(key, filters[key]);
  const response = await fetch(url, { headers: { authorization: `Bearer ${session.access_token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? "Tu sesión expiró o tu cuenta no tiene acceso al admin." : payload.error || "No se pudieron cargar los pedidos.");
  return payload;
}
export { PAGE_SIZE };
