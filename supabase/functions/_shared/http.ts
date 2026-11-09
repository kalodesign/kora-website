import { createClient } from "npm:@supabase/supabase-js@2";

const defaultOrigins = [
  "https://kora3d.co",
  "https://www.kora3d.co",
  "http://localhost:4174",
  "http://127.0.0.1:4174"
];

const allowedOrigins = new Set(
  (Deno.env.get("KORA_ALLOWED_ORIGINS") || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const clientAddress = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip") || "unknown";
};

export const enforceRateLimit = (
  request: Request,
  scope: string,
  limit: number,
  windowMs = 60_000
) => {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde." }), {
    status: 429,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Retry-After": String(Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)))
    }
  });
};

export const enforceBodyLimit = (request: Request, maxBytes: number) => {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    return new Response(JSON.stringify({ error: "La solicitud es demasiado grande." }), {
      status: 413,
      headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" }
    });
  }
  return null;
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

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
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8"
  }
});

export const handleOptions = (request: Request) =>
  new Response("ok", { headers: { ...corsHeaders(request), ...securityHeaders } });

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

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".stl": "model/stl",
  ".obj": "application/octet-stream"
};

const expectedContentType = (extension: string) => contentTypes[extension] || "application/octet-stream";

const hasValidSignature = async (file: File, extension: string) => {
  if (![".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(extension)) return true;
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if ([".jpg", ".jpeg"].includes(extension)) return startsWith([0xff, 0xd8, 0xff]);
  if (extension === ".png") return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === ".pdf") return startsWith([0x25, 0x50, 0x44, 0x46]);
  return startsWith([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
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
  if (!allowedExtensions.has(extension) || file.size > maxBytes || !(await hasValidSignature(file, extension))) {
    throw new Error("El archivo no tiene un formato o tamaño permitido");
  }

  const path = `${new Date().toISOString().slice(0, 10)}/${recordId}${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: expectedContentType(extension),
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
