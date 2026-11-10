import { enforceBodyLimit, enforceRateLimit, getSupabaseAdmin, handleOptions, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";

const getAdmin = async (request: Request) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const allowed = (Deno.env.get("KORA_ADMIN_EMAILS") || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(data.user.email.toLowerCase()) ? data.user : null;
};

const text = (value: unknown, limit = 500) => String(value ?? "").trim().slice(0, limit);
const number = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
const id = (value: unknown) => text(value, 100) || crypto.randomUUID();
const validUrl = (value: unknown) => {
  const url = text(value, 800);
  return !url || /^(https?:\/\/|\/|[a-z0-9][a-z0-9._/-]*\.(png|jpe?g|webp))/i.test(url) ? url : "";
};

const cleanBanner = (value: Record<string, unknown>, userId: string) => ({
  id: id(value.id), placement: text(value.placement, 80) || "llaveros_hero", title: text(value.title, 140),
  desktop_image: validUrl(value.desktopImage), mobile_image: validUrl(value.mobileImage) || null,
  alt_text: text(value.altText, 220), link_url: validUrl(value.linkUrl) || null,
  is_active: Boolean(value.isActive), sort_order: number(value.sortOrder), created_by: userId
});
const cleanAccount = (value: Record<string, unknown>, userId: string) => ({
  id: id(value.id), bank_name: text(value.bankName, 120), account_alias: text(value.accountAlias, 120),
  account_last_four: text(value.accountLastFour, 4).replace(/\D/g, "").slice(0, 4) || null,
  account_type: text(value.accountType, 80) || null, is_active: value.isActive !== false, created_by: userId
});
const cleanEntry = (value: Record<string, unknown>, userId: string) => ({
  id: id(value.id), entry_type: value.entryType === "income" ? "income" : "expense", category: text(value.category, 100),
  amount: number(value.amount), occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(text(value.occurredOn, 10)) ? text(value.occurredOn, 10) : new Date().toISOString().slice(0, 10),
  account_id: text(value.accountId, 100) || null, payment_method: text(value.paymentMethod, 80) || null,
  reference: text(value.reference, 120) || null, note: text(value.note, 1200) || null, created_by: userId
});
const cleanQuote = (value: Record<string, unknown>, userId: string) => {
  const items = Array.isArray(value.items) ? value.items.slice(0, 40) : [];
  const subtotal = number(value.subtotal); const discount = Math.min(subtotal, number(value.discount));
  return { id: id(value.id), quote_number: text(value.quoteNumber, 40) || `KORA-${Date.now()}`,
    status: ["draft", "sent", "approved", "rejected"].includes(text(value.status, 20)) ? text(value.status, 20) : "draft",
    customer_name: text(value.customerName, 180), customer_email: text(value.customerEmail, 180) || null,
    customer_phone: text(value.customerPhone, 60) || null, company: text(value.company, 180) || null,
    items, subtotal, discount, total: Math.max(0, number(value.total) || subtotal - discount), note: text(value.note, 1200) || null, created_by: userId };
};
const cleanTask = (value: Record<string, unknown>, userId: string) => ({
  id: id(value.id), title: text(value.title, 180), customer_name: text(value.customerName, 180) || null,
  order_reference: text(value.orderReference, 120) || null,
  due_date: /^\d{4}-\d{2}-\d{2}$/.test(text(value.dueDate, 10)) ? text(value.dueDate, 10) : null,
  notes: text(value.notes, 1200) || null,
  product_type: ["personalized", "pet"].includes(text(value.productType, 30)) ? text(value.productType, 30) : "personalized",
  payment_status: ["due", "paid"].includes(text(value.paymentStatus, 30)) ? text(value.paymentStatus, 30) : "due",
  delivery_status: ["shipping", "cash_on_delivery"].includes(text(value.deliveryStatus, 30)) ? text(value.deliveryStatus, 30) : "shipping",
  status: ["pending", "in_progress", "done"].includes(text(value.status, 30)) ? text(value.status, 30) : "pending",
  reference_image_path: text(value.referenceImagePath, 300) || null,
  reference_image_name: text(value.referenceImageName, 180) || null,
  created_by: userId
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);
  const limited = enforceRateLimit(request, "admin-business", 60);
  const oversized = enforceBodyLimit(request, 512 * 1024);
  if (limited) return limited;
  if (oversized) return oversized;
  const user = await getAdmin(request);
  if (!user) return jsonResponse(request, { error: "No autorizado" }, 401);
  const supabase = getSupabaseAdmin();
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("view") === "orders") {
        const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
        const pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get("pageSize")) || 10));
        const search = text(url.searchParams.get("q"), 100).replace(/[^\p{L}\p{N}@._#\-\s]/gu, " ").trim();
        const tab = text(url.searchParams.get("tab"), 30);
        const status = text(url.searchParams.get("status"), 30);
        const from = text(url.searchParams.get("from"), 10);
        const to = text(url.searchParams.get("to"), 10);
        let query = supabase.from("orders").select("id,reference,created_at,updated_at,status,fulfillment_status,currency,subtotal,shipping,total,items,customer,payment_provider,wompi_payment_method", { count: "exact" }).order("created_at", { ascending: false });
        if (tab === "new") query = query.eq("fulfillment_status", "pending");
        if (tab === "printing") query = query.in("fulfillment_status", ["in_progress", "ready"]);
        if (tab === "delivered") query = query.eq("fulfillment_status", "delivered");
        if (tab === "cancelled") query = query.eq("fulfillment_status", "cancelled");
        if (status && ["pending", "in_progress", "ready", "shipped", "delivered", "cancelled"].includes(status)) query = query.eq("fulfillment_status", status);
        if (/^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", new Date(from + "T00:00:00-05:00").toISOString());
        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", new Date(new Date(to + "T00:00:00-05:00").getTime() + 86400000 - 1).toISOString());
        if (search) query = query.or("reference.ilike.*" + search + "*,search_document.ilike.*" + search + "*");
        const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
        if (error) throw error;
        return jsonResponse(request, { orders: data || [], count: count || 0, page, pageSize });
      }
      const [banners, accounts, entries, quotes, tasks, orders, categories, analytics] = await Promise.all([
        supabase.from("site_banners").select("*").order("placement").order("sort_order"),
        supabase.from("finance_accounts").select("*").order("account_alias"),
        supabase.from("finance_entries").select("*").order("occurred_on", { ascending: false }).limit(250),
        supabase.from("store_quotes").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("production_tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(200),
        supabase.from("orders").select("id,reference,created_at,status,fulfillment_status,currency,subtotal,shipping,total,items,customer,payment_provider,wompi_payment_method").order("created_at", { ascending: false }).limit(500),
        supabase.from("site_home_categories").select("*").order("sort_order"),
        supabase.from("site_analytics_daily").select("day,source,page,views").gte("day", new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10)).order("day", { ascending: false })
      ]);
      for (const result of [banners, accounts, entries, quotes, tasks]) if (result.error) throw result.error;
      let orderRows = orders.data || [];
      if (orders.error) {
        const fallbackOrders = await supabase.from("orders").select("id,reference,created_at,status,currency,subtotal,shipping,total,items,customer,payment_provider,wompi_payment_method").order("created_at", { ascending: false }).limit(500);
        if (fallbackOrders.error) throw fallbackOrders.error;
        orderRows = (fallbackOrders.data || []).map((order) => ({ ...order, fulfillment_status: "pending" }));
      }
      const tasksWithImages = await Promise.all((tasks.data || []).map(async (task) => {
        if (!task.reference_image_path) return { ...task, reference_image_url: null };
        const { data } = await supabase.storage.from("task-references").createSignedUrl(task.reference_image_path, 60 * 60);
        return { ...task, reference_image_url: data?.signedUrl || null };
      }));
      return jsonResponse(request, { banners: banners.data, accounts: accounts.data, entries: entries.data, quotes: quotes.data, tasks: tasksWithImages, orders: orderRows, categories: categories.error ? [] : categories.data || [], analytics: analytics.error ? [] : analytics.data || [] });
    }
    if (request.method !== "POST") return jsonResponse(request, { error: "Método no permitido" }, 405);
    const payload = await request.json() as Record<string, unknown>;
    const action = text(payload.action, 60);
    if (action === "upsert-banner") {
      const banner = cleanBanner((payload.banner || {}) as Record<string, unknown>, user.id);
      if (!banner.title || !banner.desktop_image || !banner.alt_text) return jsonResponse(request, { error: "Completa título, imagen desktop y texto alternativo" }, 400);
      const { error } = await supabase.from("site_banners").upsert(banner); if (error) throw error;
    } else if (action === "delete-banner") {
      const { error } = await supabase.from("site_banners").delete().eq("id", text(payload.id, 100)); if (error) throw error;
    } else if (action === "upsert-account") {
      const account = cleanAccount((payload.account || {}) as Record<string, unknown>, user.id);
      if (!account.bank_name || !account.account_alias) return jsonResponse(request, { error: "Completa banco y nombre de la cuenta" }, 400);
      const { error } = await supabase.from("finance_accounts").upsert(account); if (error) throw error;
    } else if (action === "upsert-entry") {
      const entry = cleanEntry((payload.entry || {}) as Record<string, unknown>, user.id);
      if (!entry.category || !entry.amount) return jsonResponse(request, { error: "Completa categoría y valor" }, 400);
      const { error } = await supabase.from("finance_entries").upsert(entry); if (error) throw error;
    } else if (action === "delete-entry") {
      const { error } = await supabase.from("finance_entries").delete().eq("id", text(payload.id, 100)); if (error) throw error;
    } else if (action === "upsert-quote") {
      const quote = cleanQuote((payload.quote || {}) as Record<string, unknown>, user.id);
      if (!quote.customer_name) return jsonResponse(request, { error: "Completa el nombre del cliente" }, 400);
      const { error } = await supabase.from("store_quotes").upsert(quote); if (error) throw error;
    } else if (action === "delete-quote") {
      const { error } = await supabase.from("store_quotes").delete().eq("id", text(payload.id, 100)); if (error) throw error;
    } else if (action === "upsert-task") {
      const task = cleanTask((payload.task || {}) as Record<string, unknown>, user.id);
      if (!task.title) return jsonResponse(request, { error: "Completa el nombre del pedido" }, 400);
      const { data: existing, error: existingError } = await supabase.from("production_tasks").select("reference_image_path").eq("id", task.id).maybeSingle();
      if (existingError) throw existingError;
      const { error } = await supabase.from("production_tasks").upsert(task); if (error) throw error;
      if (existing?.reference_image_path && existing.reference_image_path !== task.reference_image_path) {
        await supabase.storage.from("task-references").remove([existing.reference_image_path]);
      }
    } else if (action === "update-task-status") {
      const taskId = text(payload.id, 100); const taskStatus = text(payload.status, 30);
      if (!taskId || !["pending", "in_progress", "done"].includes(taskStatus)) return jsonResponse(request, { error: "Estado de tarea no válido" }, 400);
      const { error } = await supabase.from("production_tasks").update({ status: taskStatus }).eq("id", taskId); if (error) throw error;
    } else if (action === "update-order-fulfillment") {
      const orderId = text(payload.id, 100); const fulfillmentStatus = text(payload.status, 30);
      if (!orderId || !["pending", "in_progress", "ready", "shipped", "delivered", "cancelled"].includes(fulfillmentStatus)) return jsonResponse(request, { error: "Estado de despacho no válido" }, 400);
      const { error } = await supabase.from("orders").update({ fulfillment_status: fulfillmentStatus, updated_at: new Date().toISOString() }).eq("id", orderId); if (error) throw error;
    } else if (action === "upsert-home-category") {
      const value = (payload.category || {}) as Record<string, unknown>;
      const categoryId = text(value.id, 30);
      if (!["mascotas", "llaveros", "dijes", "proyectos"].includes(categoryId)) return jsonResponse(request, { error: "Categoría no válida" }, 400);
      const category = { id: categoryId, title: text(value.title, 100), action_label: text(value.actionLabel, 60) || "Descubrir", image_url: validUrl(value.imageUrl), alt_text: text(value.altText, 220), href: validUrl(value.href), sort_order: number(value.sortOrder), is_active: value.isActive !== false, updated_by: user.id, updated_at: new Date().toISOString() };
      if (!category.title || !category.image_url || !category.alt_text || !category.href) return jsonResponse(request, { error: "Completa título, imagen, texto alternativo y enlace" }, 400);
      const { error } = await supabase.from("site_home_categories").upsert(category); if (error) throw error;
    } else if (action === "delete-task") {
      const taskId = text(payload.id, 100);
      const { data: task, error: taskError } = await supabase.from("production_tasks").select("reference_image_path").eq("id", taskId).maybeSingle();
      if (taskError) throw taskError;
      const { error } = await supabase.from("production_tasks").delete().eq("id", taskId); if (error) throw error;
      if (task?.reference_image_path) await supabase.storage.from("task-references").remove([task.reference_image_path]);
    } else return jsonResponse(request, { error: "Acción no válida" }, 400);
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("admin-business", error);
    return jsonResponse(request, { error: "No fue posible guardar la información" }, 400);
  }
});
