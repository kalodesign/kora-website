import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const envPath = join(root, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const port = Number(process.env.PORT || 4174);
const productsPath = join(root, "data", "products.json");
const contactRequestsPath = join(root, "data", "contact-requests.json");
const contactUploadsPath = join(root, "data", "contact-uploads");
const petRequestsPath = join(root, "data", "pet-requests.json");
const petUploadsPath = join(root, "data", "pet-uploads");
const ordersPath = join(root, "data", "orders.json");
const privateKey = process.env.KORA_PRIVATE_KEY || "kora-interno";
const maxContactBodySize = 16 * 1024 * 1024;
const allowedContactExtensions = new Set([".png", ".jpg", ".jpeg", ".pdf", ".stl", ".obj"]);
const allowedPetExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const publicApiPaths = new Set(["/api/contact", "/api/pet-request", "/api/checkout/wompi", "/api/wompi/webhook"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf"
};

const send = (res, status, body, type = "text/plain; charset=utf-8") => {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15_000_000) {
        reject(new Error("Payload demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const readJsonFile = async (path, fallback = []) => {
  try {
    const data = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
};

const appendJsonFile = async (path, record) => {
  const rows = await readJsonFile(path, []);
  rows.push(record);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(rows, null, 2), "utf8");
  return record;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const getNestedValue = (source, path) =>
  path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : ""), source);

const toSnakeKey = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toSupabasePayload = (payload) =>
  Object.fromEntries(Object.entries(payload).map(([key, value]) => [toSnakeKey(key), value]));

const buildPublicUrl = (req, path) => {
  const siteUrl = process.env.KORA_SITE_URL || "";
  if (siteUrl) return `${siteUrl.replace(/\/$/, "")}${path}`;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${req.headers.host}${path}`;
};

const insertSupabase = async (table, payload) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !table || typeof fetch !== "function") return false;

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(toSupabasePayload(payload))
  });

  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return true;
};

const readBinaryBody = (req, limit) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error("Payload demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const isPrivatePath = (pathname) =>
  (pathname.startsWith("/api/") && !publicApiPaths.has(pathname)) ||
  pathname.startsWith("/calculadora") ||
  pathname === "/admin-productos.html";

const hasAccess = (req, url) => {
  const cookie = req.headers.cookie || "";
  return url.searchParams.get("key") === privateKey || cookie.includes(`kora_private=${privateKey}`);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (isPrivatePath(url.pathname) && !hasAccess(req, url)) {
    send(res, 401, "Ruta privada. Ingresa con ?key=kora-interno o define KORA_PRIVATE_KEY.");
    return;
  }

  if (isPrivatePath(url.pathname) && url.searchParams.get("key") === privateKey) {
    res.setHeader("Set-Cookie", `kora_private=${privateKey}; Path=/; SameSite=Lax`);
  }

  if (url.pathname === "/api/products" && req.method === "GET") {
    try {
      send(res, 200, await readFile(productsPath, "utf8"), types[".json"]);
    } catch {
      send(res, 500, JSON.stringify({ error: "No se pudieron leer los productos" }), types[".json"]);
    }
    return;
  }

  if (url.pathname === "/api/products" && req.method === "PUT") {
    try {
      const products = JSON.parse(await readBody(req));
      if (!Array.isArray(products)) throw new Error("Formato invalido");
      await writeFile(productsPath, JSON.stringify(products, null, 2), "utf8");
      send(res, 200, JSON.stringify({ ok: true }), types[".json"]);
    } catch {
      send(res, 400, JSON.stringify({ error: "No se pudieron guardar los productos" }), types[".json"]);
    }
    return;
  }

  if (url.pathname === "/api/contact" && req.method === "POST") {
    try {
      const contentType = req.headers["content-type"] || "";
      if (!contentType.startsWith("multipart/form-data")) throw new Error("Formato invalido");

      const body = await readBinaryBody(req, maxContactBodySize);
      const formRequest = new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": contentType },
        body
      });
      const formData = await formRequest.formData();
      const value = (key, maxLength = 1000) => String(formData.get(key) || "").trim().slice(0, maxLength);
      const name = value("name", 120);
      const email = value("email", 180);
      const projectType = value("projectType", 60);
      const details = value("details", 5000);

      if (!name || !email.includes("@") || !projectType || !details) {
        send(res, 400, JSON.stringify({ error: "Completa los campos obligatorios" }), types[".json"]);
        return;
      }

      const id = randomUUID();
      const reference = formData.get("reference");
      let savedReference = null;

      if (reference && typeof reference.arrayBuffer === "function" && reference.size > 0) {
        const extension = extname(reference.name || "").toLowerCase();
        if (!allowedContactExtensions.has(extension) || reference.size > 15 * 1024 * 1024) {
          send(res, 400, JSON.stringify({ error: "La referencia no tiene un formato o tamaño permitido" }), types[".json"]);
          return;
        }
        await mkdir(contactUploadsPath, { recursive: true });
        const storedName = `${id}${extension}`;
        await writeFile(join(contactUploadsPath, storedName), Buffer.from(await reference.arrayBuffer()));
        savedReference = {
          originalName: reference.name,
          storedName,
          type: reference.type,
          size: reference.size
        };
      }

      const requestRecord = {
        id,
        createdAt: new Date().toISOString(),
        name,
        email,
        company: value("company", 180),
        projectType,
        quantity: value("quantity", 20),
        budget: value("budget", 60),
        details,
        reference: savedReference
      };
      await appendJsonFile(contactRequestsPath, requestRecord);
      await insertSupabase(process.env.SUPABASE_CONTACT_TABLE || "contact_requests", requestRecord).catch(console.error);
      send(res, 201, JSON.stringify({ ok: true, id }), types[".json"]);
    } catch {
      if (!res.headersSent) {
        send(res, 400, JSON.stringify({ error: "No se pudo guardar la solicitud" }), types[".json"]);
      }
    }
    return;
  }

  if (url.pathname === "/api/pet-request" && req.method === "POST") {
    try {
      const contentType = req.headers["content-type"] || "";
      if (!contentType.startsWith("multipart/form-data")) throw new Error("Formato invalido");

      const body = await readBinaryBody(req, maxContactBodySize);
      const formRequest = new Request("http://localhost/api/pet-request", {
        method: "POST",
        headers: { "content-type": contentType },
        body
      });
      const formData = await formRequest.formData();
      const value = (key, maxLength = 1000) => String(formData.get(key) || "").trim().slice(0, maxLength);
      const clientName = value("client-name", 120);
      const petName = value("pet-name", 120);
      const petType = value("pet-type", 60);

      if (!clientName || !petName || !petType) {
        send(res, 400, JSON.stringify({ error: "Completa los campos obligatorios" }), types[".json"]);
        return;
      }

      const id = randomUUID();
      const photo = formData.get("pet-photo");
      let savedPhoto = null;

      if (photo && typeof photo.arrayBuffer === "function" && photo.size > 0) {
        const extension = extname(photo.name || "").toLowerCase();
        if (!allowedPetExtensions.has(extension) || photo.size > 15 * 1024 * 1024) {
          send(res, 400, JSON.stringify({ error: "La foto no tiene un formato o tamaño permitido" }), types[".json"]);
          return;
        }
        await mkdir(petUploadsPath, { recursive: true });
        const storedName = `${id}${extension}`;
        await writeFile(join(petUploadsPath, storedName), Buffer.from(await photo.arrayBuffer()));
        savedPhoto = {
          originalName: photo.name,
          storedName,
          type: photo.type,
          size: photo.size
        };
      }

      const petRecord = {
        id,
        createdAt: new Date().toISOString(),
        clientName,
        petName,
        petType,
        petColor: value("pet-color", 120),
        details: value("pet-details", 3000),
        photo: savedPhoto
      };

      await appendJsonFile(petRequestsPath, petRecord);
      await insertSupabase(process.env.SUPABASE_PET_TABLE || "pet_requests", petRecord).catch(console.error);
      send(res, 201, JSON.stringify({ ok: true, id }), types[".json"]);
    } catch {
      if (!res.headersSent) {
        send(res, 400, JSON.stringify({ error: "No se pudo guardar la solicitud" }), types[".json"]);
      }
    }
    return;
  }

  if (url.pathname === "/api/checkout/wompi" && req.method === "POST") {
    try {
      const publicKey = process.env.WOMPI_PUBLIC_KEY;
      const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
      if (!publicKey || !integritySecret) {
        send(res, 503, JSON.stringify({ error: "Wompi no esta configurado todavia" }), types[".json"]);
        return;
      }

      const payload = JSON.parse(await readBody(req));
      const cartItems = Array.isArray(payload.items) ? payload.items : [];
      const customer = payload.customer || {};
      const customerEmail = String(customer.email || "").trim();
      if (!cartItems.length || !customerEmail.includes("@")) {
        send(res, 400, JSON.stringify({ error: "Completa los datos del pedido" }), types[".json"]);
        return;
      }

      const products = await readJsonFile(productsPath, []);
      const items = cartItems
        .map((cartItem) => {
          const product = products.find((item) => item.id === cartItem.id);
          const qty = Math.max(1, Math.min(Number(cartItem.qty || 1), Number(product?.stock || 99)));
          return product ? {
            id: product.id,
            title: product.title,
            qty,
            unitPrice: Number(product.price || 0),
            total: Number(product.price || 0) * qty
          } : null;
        })
        .filter(Boolean);

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const freeShippingFrom = Number(process.env.KORA_FREE_SHIPPING_FROM_COP || 50000);
      const flatShipping = Number(process.env.KORA_SHIPPING_FLAT_COP || 0);
      const shipping = subtotal >= freeShippingFrom ? 0 : flatShipping;
      const total = subtotal + shipping;
      if (!items.length || total <= 0) {
        send(res, 400, JSON.stringify({ error: "El carrito no tiene productos validos" }), types[".json"]);
        return;
      }

      const reference = `KORA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`.toUpperCase();
      const amountInCents = Math.round(total * 100);
      const currency = "COP";
      const integrity = sha256(`${reference}${amountInCents}${currency}${integritySecret}`);
      const redirectUrl = buildPublicUrl(req, `/checkout-resultado.html?reference=${encodeURIComponent(reference)}`);
      const order = {
        id: randomUUID(),
        reference,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        currency,
        subtotal,
        shipping,
        total,
        amountInCents,
        items,
        customer: {
          name: String(customer.name || "").trim().slice(0, 120),
          email: customerEmail.slice(0, 180),
          phone: String(customer.phone || "").trim().slice(0, 40),
          address: String(customer.address || "").trim().slice(0, 220),
          city: String(customer.city || "").trim().slice(0, 100),
          region: String(customer.region || "").trim().slice(0, 100),
          notes: String(customer.notes || "").trim().slice(0, 1000)
        },
        paymentProvider: "wompi"
      };

      await appendJsonFile(ordersPath, order);
      await insertSupabase(process.env.SUPABASE_ORDERS_TABLE || "orders", order).catch(console.error);
      send(res, 201, JSON.stringify({
        ok: true,
        checkoutUrl: "https://checkout.wompi.co/p/",
        publicKey,
        currency,
        amountInCents,
        reference,
        integrity,
        redirectUrl,
        customerEmail: order.customer.email,
        order
      }), types[".json"]);
    } catch {
      if (!res.headersSent) {
        send(res, 400, JSON.stringify({ error: "No se pudo crear el checkout" }), types[".json"]);
      }
    }
    return;
  }

  if (url.pathname === "/api/wompi/webhook" && req.method === "POST") {
    try {
      const payload = JSON.parse(await readBody(req));
      const eventSecret = process.env.WOMPI_EVENTS_SECRET;
      if (eventSecret && payload.signature?.properties?.length) {
        const signatureSource = payload.signature.properties
          .map((property) => getNestedValue(payload.data, property))
          .join("");
        const checksum = sha256(`${signatureSource}${payload.timestamp}${eventSecret}`).toUpperCase();
        const incomingChecksum = String(payload.signature.checksum || req.headers["x-event-checksum"] || "").toUpperCase();
        if (checksum !== incomingChecksum) {
          send(res, 401, JSON.stringify({ error: "Firma de evento invalida" }), types[".json"]);
          return;
        }
      }

      const transaction = payload.data?.transaction || {};
      const orders = await readJsonFile(ordersPath, []);
      const index = orders.findIndex((order) => order.reference === transaction.reference);
      if (index >= 0) {
        orders[index] = {
          ...orders[index],
          status: transaction.status || orders[index].status,
          wompiTransactionId: transaction.id || orders[index].wompiTransactionId,
          wompiPaymentMethod: transaction.payment_method_type || orders[index].wompiPaymentMethod,
          updatedAt: new Date().toISOString()
        };
        await writeFile(ordersPath, JSON.stringify(orders, null, 2), "utf8");
        await insertSupabase(process.env.SUPABASE_ORDERS_TABLE || "orders", orders[index]).catch(console.error);
      }
      send(res, 200, JSON.stringify({ ok: true }), types[".json"]);
    } catch {
      if (!res.headersSent) send(res, 400, JSON.stringify({ error: "Evento invalido" }), types[".json"]);
    }
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
  const filePath = normalize(join(root, decodeURIComponent(pathname)));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Acceso denegado");
    return;
  }

  try {
    const ext = extname(filePath).toLowerCase();
    send(res, 200, await readFile(filePath), types[ext] || "application/octet-stream");
  } catch {
    send(res, 404, "No encontrado");
  }
}).listen(port, () => {
  console.log(`Kora local: http://localhost:${port}`);
});
