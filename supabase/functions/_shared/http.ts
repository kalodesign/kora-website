import { createClient } from "npm:@supabase/supabase-js@2";

const defaultOrigins = [
  "https://www.cora3d.co",
  "https://cora3d.co",
  "http://localhost:4174",
  "http://127.0.0.1:4174"
];

const allowedOrigins = new Set(
  (Deno.env.get("KORA_ALLOWED_ORIGINS") || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

export const corsHeaders = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.has(origin) ? origin : defaultOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
};

export const isAllowedBrowserOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins.has(origin);
};

export const jsonResponse = (
  request: Request,
  body: Record<string, unknown>,
  status = 200
) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders(request),
    "Content-Type": "application/json; charset=utf-8"
  }
});

export const handleOptions = (request: Request) =>
  new Response("ok", { headers: corsHeaders(request) });

export const getSupabaseAdmin = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase no esta configurado");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export const textValue = (formData: FormData, key: string, maxLength = 1000) =>
  String(formData.get(key) || "").trim().slice(0, maxLength);

const safeExtension = (name: string) => {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || "";
};

export const uploadFormFile = async ({
  supabase,
  file,
  bucket,
  recordId,
  allowedExtensions,
  maxBytes = 15 * 1024 * 1024
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  file: FormDataEntryValue | null;
  bucket: string;
  recordId: string;
  allowedExtensions: Set<string>;
  maxBytes?: number;
}) => {
  if (!(file instanceof File) || file.size === 0) return null;

  const extension = safeExtension(file.name);
  if (!allowedExtensions.has(extension) || file.size > maxBytes) {
    throw new Error("El archivo no tiene un formato o tamaño permitido");
  }

  const path = `${new Date().toISOString().slice(0, 10)}/${recordId}${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  if (error) throw error;

  return {
    bucket,
    path,
    originalName: file.name,
    type: file.type,
    size: file.size
  };
};

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const getNestedValue = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return "";
  }, source);
