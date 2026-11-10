import { enforceBodyLimit, enforceRateLimit, getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse, uploadFormFile } from "../_shared/http.ts";

const isAdmin = async (request: Request) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.auth.getUser(token);
  const allowed = (Deno.env.get("KORA_ADMIN_EMAILS") || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(data.user?.email && allowed.includes(data.user.email.toLowerCase()));
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  const limited = enforceRateLimit(request, "admin-task-image", 20);
  const oversized = enforceBodyLimit(request, 10 * 1024 * 1024);
  if (limited) return limited;
  if (oversized) return oversized;
  if (!(await isAdmin(request))) return jsonResponse(request, { error: "No autorizado" }, 401);
  if (request.method !== "POST") return jsonResponse(request, { error: "Método no permitido" }, 405);
  try {
    const form = await request.formData();
    const upload = await uploadFormFile({
      supabase: getSupabaseAdmin(), file: form.get("image"), bucket: "task-references",
      recordId: String(form.get("id") || crypto.randomUUID()),
      allowedExtensions: new Set([".png", ".jpg", ".jpeg", ".webp"]), maxBytes: 8 * 1024 * 1024
    });
    if (!upload) return jsonResponse(request, { error: "Selecciona una imagen" }, 400);
    return jsonResponse(request, { ok: true, path: upload.path, name: upload.originalName });
  } catch (error) {
    console.error("admin-task-image", error);
    return jsonResponse(request, { error: "No fue posible subir la imagen" }, 400);
  }
});
