import { enforceBodyLimit, enforceRateLimit, getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse, uploadFormFile } from "../_shared/http.ts";

const getAdmin = async (request: Request) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const allowedEmails = (Deno.env.get("KORA_ADMIN_EMAILS") || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowedEmails.includes(data.user.email.toLowerCase()) ? data.user : null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  const limited = enforceRateLimit(request, "admin-product-image", 20);
  const oversized = enforceBodyLimit(request, 10 * 1024 * 1024);
  if (limited) return limited;
  if (oversized) return oversized;
  if (!await getAdmin(request)) return jsonResponse(request, { error: "No autorizado" }, 401);
  try {
    const formData = await request.formData();
    const id = String(formData.get("id") || crypto.randomUUID()).trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 100);
    const image = await uploadFormFile({
      supabase: getSupabaseAdmin(),
      file: formData.get("image"),
      bucket: "product-images",
      recordId: id,
      allowedExtensions: new Set([".png", ".jpg", ".jpeg", ".webp"]),
      maxBytes: 5 * 1024 * 1024
    });
    if (!image) return jsonResponse(request, { error: "Selecciona una imagen" }, 400);
    const { data } = getSupabaseAdmin().storage.from("product-images").getPublicUrl(image.path);
    return jsonResponse(request, { ok: true, url: data.publicUrl, image });
  } catch (error) {
    console.error("admin-product-image", error);
    return jsonResponse(request, { error: "No fue posible cargar la imagen" }, 400);
  }
});
