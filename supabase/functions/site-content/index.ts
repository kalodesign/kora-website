import { getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  if (request.method !== "GET") return jsonResponse(request, { error: "Método no permitido" }, 405);
  try {
    const supabase = getSupabaseAdmin();
    const [banners, categories] = await Promise.all([
      supabase.from("site_banners").select("placement,title,desktop_image,mobile_image,alt_text,link_url,sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("site_home_categories").select("id,title,action_label,image_url,alt_text,href,sort_order").eq("is_active", true).order("sort_order")
    ]);
    if (banners.error) throw banners.error;
    return jsonResponse(request, { banners: banners.data || [], homeCategories: categories.error ? [] : categories.data || [] });
  } catch (error) {
    console.error("site-content", error);
    return jsonResponse(request, { banners: [], homeCategories: [] });
  }
});
