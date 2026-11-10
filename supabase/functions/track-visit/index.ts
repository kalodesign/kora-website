import { enforceBodyLimit, enforceRateLimit, getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";

const classify = (host: string) => {
  const value = host.toLowerCase().replace(/^www\./, "");
  if (!value) return "direct";
  if (["google.com", "bing.com", "yahoo.com", "duckduckgo.com", "ecosia.org"].some((domain) => value === domain || value.endsWith(`.${domain}`))) return "organic_search";
  if (value === "instagram.com" || value.endsWith(".instagram.com")) return "instagram";
  if (value === "facebook.com" || value.endsWith(".facebook.com") || value === "fb.com") return "facebook";
  if (["tiktok.com", "pinterest.com", "youtube.com", "x.com", "twitter.com"].some((domain) => value === domain || value.endsWith(`.${domain}`))) return "other_social";
  return "referral";
};
const classifyCampaign = (source: string) => {
  const value = source.toLowerCase();
  if (["google", "bing", "yahoo", "duckduckgo"].includes(value)) return "organic_search";
  if (["instagram", "ig"].includes(value)) return "instagram";
  if (["facebook", "fb", "meta"].includes(value)) return "facebook";
  if (["tiktok", "pinterest", "youtube", "x", "twitter"].includes(value)) return "other_social";
  if (["direct", "organic_search", "instagram", "facebook", "other_social", "referral"].includes(value)) return value;
  return "";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "Método no permitido" }, 405);
  const limited = enforceRateLimit(request, "track-visit", 120);
  const oversized = enforceBodyLimit(request, 2048);
  if (limited) return limited;
  if (oversized) return oversized;
  try {
    const payload = await request.json() as { page?: unknown; referrerHost?: unknown; campaignSource?: unknown; device?: unknown };
    const page = String(payload.page || "/").slice(0, 100).replace(/[^a-zA-Z0-9/_.-]/g, "") || "/";
    const referrerHost = String(payload.referrerHost || "").slice(0, 120).replace(/[^a-zA-Z0-9.-]/g, "");
    const source = classifyCampaign(String(payload.campaignSource || "")) || classify(referrerHost);
    const device = ["mobile", "desktop"].includes(String(payload.device || "")) ? String(payload.device) : "unknown";
    const { error } = await getSupabaseAdmin().rpc("track_site_visit", { p_source: source, p_page: page, p_device: device });
    if (error) throw error;
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("track-visit", error);
    return jsonResponse(request, { error: "No fue posible registrar la visita" }, 400);
  }
});
