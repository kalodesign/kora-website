import { enforceBodyLimit, enforceRateLimit, getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";
import { getGlobalColors, getStoreProducts, normalizeAdminProduct, normalizeColors } from "../_shared/catalog.ts";

const getAdmin = async (request: Request) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const allowedEmails = (Deno.env.get("KORA_ADMIN_EMAILS") || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(data.user.email.toLowerCase()) ? data.user : null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  const limited = enforceRateLimit(request, "admin-catalog", 60);
  const oversized = enforceBodyLimit(request, 512 * 1024);
  if (limited) return limited;
  if (oversized) return oversized;
  const user = await getAdmin(request);
  if (!user) return jsonResponse(request, { error: "No autorizado" }, 401);
  const supabase = getSupabaseAdmin();
  try {
    if (request.method === "GET") {
      const [products, globalColors] = await Promise.all([getStoreProducts(true), getGlobalColors()]);
      return jsonResponse(request, { products, globalColors, user: user.email });
    }
    if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
    const payload = await request.json();
    if (payload.action === "upsert") {
      const product = normalizeAdminProduct(payload.product || {});
      if (!product.id || !product.title || !product.category || !product.material || !product.image || !product.description || product.price <= 0) {
        return jsonResponse(request, { error: "Completa los campos obligatorios del producto" }, 400);
      }
      const { error } = await supabase.from("store_products").upsert({
        id: product.id,
        title: product.title,
        category: product.category,
        product_type: product.productType,
        image: product.image,
        images: product.images,
        description: product.description,
        size: product.size,
        material: product.material,
        price: product.price,
        compare_at: product.compareAt || null,
        stock: product.stock,
        is_active: product.isActive,
        related_product_ids: [],
        components: product.components.filter((item) => item.productId !== product.id),
        name_options: product.nameOptions,
        tags: product.tags,
        color_mode: product.colorMode,
        colors: product.colors
      });
      if (error) throw error;
      return jsonResponse(request, { ok: true, product });
    }
    if (payload.action === "set-global-colors") {
      const globalColors = normalizeColors(payload.colors);
      const { error } = await supabase.from("store_settings").upsert({ key: "global_colors", value: globalColors });
      if (error) throw error;
      return jsonResponse(request, { ok: true, globalColors });
    }
    if (payload.action === "delete") {
      const { error } = await supabase.from("store_products").delete().eq("id", String(payload.id || ""));
      if (error) throw error;
      return jsonResponse(request, { ok: true });
    }
    return jsonResponse(request, { error: "Acción no válida" }, 400);
  } catch (error) {
    console.error("admin-catalog", error);
    return jsonResponse(request, { error: "No fue posible guardar el catálogo" }, 400);
  }
});
