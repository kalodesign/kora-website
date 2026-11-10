(() => {
  const config = window.KORA_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const endpoint = window.koraEndpoint?.("admin-business", "") || "";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const money = (value) => Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const date = (value) => value ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const views = ["orders", "analytics", "pages"];
  const titles = { orders: "Órdenes de tienda", analytics: "Métricas del sitio", pages: "Página y categorías" };
  const labels = { pending: "Pendiente", in_progress: "En preparación", ready: "Listo", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado" };
  let data = { orders: [], analytics: [], categories: [], banners: [] };
  let session;
  const nav = document.querySelector(".admin-side-nav");
  const shell = document.querySelector(".admin-shell");
  if (!nav || !shell) return;
  const modules = {};
  const makeModule = (view) => {
    const section = document.createElement("section"); section.className = "admin-module admin-enhanced-module"; section.id = `admin-${view}-view`; section.hidden = true; section.setAttribute("aria-labelledby", `admin-${view}-title`);
    section.innerHTML = `<div class="admin-section-head admin-section-divider"><div><p class="admin-section-kicker">Administración de Kora</p><h2 id="admin-${view}-title">${titles[view]}</h2><p>${view === "orders" ? "Pedidos confirmados desde la tienda. El estado de despacho se gestiona por separado del pago." : view === "analytics" ? "Sesiones agregadas por origen, página de entrada y dispositivo. No guardamos datos personales." : "Edita las tarjetas estáticas del home y administra banners."}</p></div></div><div data-panel="${view}"></div>`;
    shell.append(section); modules[view] = section; return section;
  };
  views.forEach((view) => {
    const button = document.createElement("button"); button.type = "button"; button.dataset.adminView = view; button.innerHTML = `<span aria-hidden="true">${view === "orders" ? "▣" : view === "analytics" ? "▥" : "▧"}</span>${titles[view]}`; nav.append(button); makeModule(view);
  });
  const navItems = [...document.querySelectorAll("[data-admin-view]")];
  const switchView = (view) => {
    const valid = ["overview", "tasks", "banners", "finance", "products", ...views].includes(view) ? view : "overview";
    document.querySelectorAll(".admin-module").forEach((section) => { section.hidden = section.id !== (valid === "products" ? "admin-dashboard-view" : `admin-${valid}-view`); });
    document.querySelector("#admin-editor-view")?.setAttribute("hidden", "");
    document.querySelector("#admin-global-colors")?.setAttribute("hidden", "");
    document.body.classList.remove("admin-is-editor");
    navItems.forEach((button) => button.classList.toggle("active", button.dataset.adminView === valid));
    localStorage.setItem("kora_admin_last_view", valid); window.scrollTo({ top: 0, behavior: "smooth" });
    if (views.includes(valid)) render(valid);
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-view]"); if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); switchView(button.dataset.adminView);
  }, true);
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-admin-calculator]")) return;
    event.preventDefault(); event.stopImmediatePropagation(); window.top.location.href = "/calculadora/index.html?origen=admin";
  }, true);
  const api = async (method = "GET", body, query = "") => {
    const response = await fetch(`${endpoint}${query}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "No fue posible cargar los datos."); return payload;
  };
  const panel = (view) => modules[view].querySelector(`[data-panel="${view}"]`);
  const sourceLabels = { direct: "Directo", organic_search: "Búsqueda", instagram: "Instagram", facebook: "Facebook", other_social: "Otras redes", referral: "Referencias" };
  const paymentLabels = { paid: "Pagado", approved: "Aprobado", pending: "Pendiente", declined: "Rechazado", failed: "Fallido", refunded: "Reembolsado", voided: "Anulado", cod_pending: "Contraentrega" };
  const renderOrders = () => {
    const target = panel("orders");
    target.innerHTML = `<div class="admin-enhanced-toolbar"><label>Buscar orden o cliente<input type="search" data-order-search placeholder="Referencia, nombre o correo" /></label><label>Pago<select data-order-payment><option value="">Todos los pagos</option>${Object.entries(paymentLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Despacho<select data-order-fulfillment><option value="">Todos los estados</option>${Object.entries(labels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><button class="button button-secondary" type="button" data-refresh>Actualizar</button></div><div class="admin-enhanced-table-wrap"><table class="admin-enhanced-table"><thead><tr><th>Orden</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Despacho</th><th>Detalle</th></tr></thead><tbody data-orders-body></tbody></table></div><p class="admin-status" data-orders-message aria-live="polite"></p>`;
    const tbody = target.querySelector("[data-orders-body]");
    const draw = () => {
      const query = target.querySelector("[data-order-search]").value.toLowerCase(); const payFilter = target.querySelector("[data-order-payment]").value; const shipFilter = target.querySelector("[data-order-fulfillment]").value;
      const rows = data.orders.filter((order) => {
        const customer = order.customer || {}; const haystack = `${order.reference || order.id} ${customer.name || customer.full_name || ""} ${customer.email || ""}`.toLowerCase();
        const payment = String(order.status || "").toLowerCase();
        return haystack.includes(query) && (!payFilter || payment === payFilter) && (!shipFilter || (order.fulfillment_status || "pending") === shipFilter);
      });
      tbody.innerHTML = rows.length ? rows.map((order) => {
        const customer = order.customer || {}; const orderItems = Array.isArray(order.items) ? order.items : [];
        const payment = String(order.status || "").toLowerCase();
        return `<tr><td><strong>${esc(order.reference || String(order.id).slice(0, 8))}</strong><small>${orderItems.length} producto${orderItems.length === 1 ? "" : "s"}</small></td><td>${esc(customer.name || customer.full_name || "Cliente")}<small>${esc(customer.email || customer.phone || "")}</small></td><td>${date(order.created_at)}</td><td>${money(order.total)}</td><td><span class="admin-pill ${esc(payment)}">${esc(paymentLabels[payment] || payment || "Sin estado")}</span></td><td><select data-fulfillment="${esc(order.id)}" aria-label="Estado de despacho">${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${(order.fulfillment_status || "pending") === value ? "selected" : ""}>${label}</option>`).join("")}</select></td><td><details><summary>Ver</summary><div class="admin-order-detail"><p>${esc(customer.phone || "Sin teléfono")} · ${esc(customer.address || customer.shipping_address || "Dirección no registrada")}</p>${orderItems.map((item) => `<p>${esc(item.name || item.title || "Producto")} × ${esc(item.qty || item.quantity || 1)} — ${money(item.total || item.unitPrice || item.price || item.unit_price)}</p>`).join("")}</div></details></td></tr>`;
      }).join("") : `<tr><td colspan="7" class="admin-empty-inline">${data.orders.length ? "No hay órdenes para estos filtros." : "Todavía no hay órdenes de tienda registradas."}</td></tr>`;
    };
    target.querySelectorAll("[data-order-search], [data-order-payment], [data-order-fulfillment]").forEach((control) => control.addEventListener("input", draw));
    target.querySelector("[data-refresh]").addEventListener("click", () => load(true));
    tbody.addEventListener("change", async (event) => {
      const select = event.target.closest("[data-fulfillment]"); if (!select) return;
      const message = target.querySelector("[data-orders-message]"); message.textContent = "Guardando despacho…";
      try { await api("POST", { action: "update-order-fulfillment", id: select.dataset.fulfillment, status: select.value }); const order = data.orders.find((item) => item.id === select.dataset.fulfillment); if (order) order.fulfillment_status = select.value; message.textContent = "Estado de despacho actualizado."; }
      catch (error) { message.textContent = error.message; }
    });
    draw();
  };
  const renderAnalytics = () => {
    const target = panel("analytics"), records = data.analytics;
    const total = records.reduce((sum, row) => sum + Number(row.views || 0), 0);
    const devices = records.reduce((sum, row) => { const key = row.device === "mobile" ? "mobile" : row.device === "desktop" ? "desktop" : "unknown"; sum[key] += Number(row.views || 0); return sum; }, { mobile: 0, desktop: 0, unknown: 0 });
    const sources = Object.values(records.reduce((map, row) => { const key = row.source || "direct"; const item = map[key] || (map[key] = { source: key, sessions: 0, mobile: 0, desktop: 0 }); const count = Number(row.views || 0); item.sessions += count; if (row.device === "mobile") item.mobile += count; if (row.device === "desktop") item.desktop += count; return map; }, {})).sort((a, b) => b.sessions - a.sessions);
    const pages = Object.entries(records.reduce((map, row) => { map[row.page] = (map[row.page] || 0) + Number(row.views || 0); return map; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const number = (value) => Number(value || 0).toLocaleString("es-CO"), share = (value) => total ? `${Math.round(value * 100 / total)}%` : "0%";
    target.innerHTML = `<div class="admin-enhanced-toolbar"><label>Periodo del reporte<select data-analytics-days><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Últimos 365 días</option></select></label><button class="button button-secondary" type="button" data-analytics-refresh>Actualizar</button></div>
      <div class="admin-analytics-summary">
        <article><span>Sesiones estimadas</span><strong>${number(total)}</strong><small>Una sesión por pestaña; se renueva tras 30 min de inactividad</small></article>
        <article><span>Desde móviles</span><strong>${number(devices.mobile)}</strong><small>${share(devices.mobile)} de las sesiones</small></article>
        <article><span>Desde escritorio</span><strong>${number(devices.desktop)}</strong><small>${share(devices.desktop)} de las sesiones</small></article>
        <article><span>Origen principal</span><strong>${esc(sources[0] ? sourceLabels[sources[0].source] || sources[0].source : "Sin datos")}</strong><small>${sources[0] ? `${number(sources[0].sessions)} sesiones` : "Se mostrará cuando ingrese tráfico"}</small></article>
      </div><div class="admin-business-grid">
        <section class="admin-panel"><div class="admin-panel-head"><h3>Origen y dispositivo</h3><span>Sesiones</span></div>
          ${sources.length ? sources.map((item) => `<div class="admin-analytics-row"><span>${esc(sourceLabels[item.source] || item.source)}<small>Móvil ${number(item.mobile)} · Escritorio ${number(item.desktop)}</small></span><strong>${number(item.sessions)} <small>${share(item.sessions)}</small></strong></div>`).join("") : `<p class="admin-empty-inline">Todavía no hay sesiones en este periodo.</p>`}
        </section><section class="admin-panel"><div class="admin-panel-head"><h3>Páginas de entrada</h3><span>Sesiones</span></div>
          ${pages.length ? pages.map(([page, count]) => `<div class="admin-analytics-row"><span title="${esc(page)}">${esc(page)}</span><strong>${number(count)}</strong></div>`).join("") : `<p class="admin-empty-inline">No hay páginas registradas para este periodo.</p>`}
        </section></div><p class="admin-field-help">Clasificamos tráfico directo, búsqueda orgánica, Instagram, Facebook, otras redes y referencias. Guardamos totales diarios y tipo de dispositivo; no registramos IP, nombres ni identificadores de visitantes. Las sesiones son una estimación, no personas únicas.</p>`;
    const range = target.querySelector("[data-analytics-days]"); range.value = String(window.koraAnalyticsDays || 90);
    const refresh = async () => { const days = Number(range.value) || 90; window.koraAnalyticsDays = days; const button = target.querySelector("[data-analytics-refresh]"); button.disabled = true;
      try { const payload = await api("GET", undefined, `?analytics_days=${days}`); data.analytics = payload.analytics || []; renderAnalytics(); }
      catch (error) { target.querySelector(".admin-field-help").textContent = `No se pudieron cargar las métricas: ${error.message}`; }
      finally { target.querySelector("[data-analytics-refresh]")?.removeAttribute("disabled"); }
    };
    range.addEventListener("change", refresh); target.querySelector("[data-analytics-refresh]").addEventListener("click", refresh);
  };
  const renderPages = () => {
    const target = panel("pages");
    target.innerHTML = `<div class="admin-page-editor-grid">${data.categories.map((category) => `<form class="admin-panel admin-category-form" data-category="${esc(category.id)}"><div class="admin-panel-head"><h3>${esc(category.title || category.id)}</h3><label class="admin-toggle"><input type="checkbox" name="active" ${category.is_active ? "checked" : ""}/>Visible</label></div><img class="admin-category-preview" src="${esc(category.image_url)}" alt=""/><label>Título<input name="title" maxlength="100" required value="${esc(category.title)}"/></label><label>Texto del enlace<input name="action" maxlength="60" value="${esc(category.action_label || "Descubrir")}"/></label><label>Imagen<input name="image" type="file" accept="image/png,image/jpeg,image/webp"/><small>PNG, JPG o WEBP · máximo 8 MB</small></label><label>Texto alternativo<input name="alt" maxlength="220" required value="${esc(category.alt_text)}"/></label><label>Enlace destino<input name="href" maxlength="500" required value="${esc(category.href)}"/></label><label>Orden<input name="order" type="number" min="0" value="${Number(category.sort_order) || 0}"/></label><button class="button button-primary" type="submit">Guardar cambios</button><p class="admin-status" aria-live="polite"></p></form>`).join("") || `<p class="admin-empty-inline">No se recibieron categorías. Aplica la migración de contenido para activarlas.</p>`}</div><div class="admin-panel admin-page-banners"><div><h3>Banners del sitio</h3><p>Administra banners de inicio, llaveros y mascotas desde el editor existente.</p></div><button class="button button-secondary" type="button" data-open-banners>Administrar banners</button></div>`;
    target.querySelectorAll("[data-category]").forEach((form) => form.addEventListener("submit", async (event) => {
      event.preventDefault(); const status = form.querySelector(".admin-status"); const button = form.querySelector("button[type=submit]"); const fields = new FormData(form); button.disabled = true; status.textContent = "Guardando…";
      try {
        let imageUrl = data.categories.find((item) => item.id === form.dataset.category)?.image_url || ""; const file = fields.get("image");
        if (file) { if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Elige una imagen PNG, JPG o WEBP de hasta 8 MB."); const body = new FormData(); body.set("id", `home-${form.dataset.category}`); body.set("image", file); const response = await fetch(window.koraEndpoint("admin-banner-image", ""), { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body }); const uploaded = await response.json(); if (!response.ok) throw new Error(uploaded.error || "No se pudo subir la imagen."); imageUrl = uploaded.url; }
        const result = await api("POST", { action: "upsert-home-category", category: { id: form.dataset.category, title: fields.get("title"), actionLabel: fields.get("action"), imageUrl, altText: fields.get("alt"), href: fields.get("href"), sortOrder: fields.get("order"), isActive: fields.get("active") === "on" } });
        await load(false); const refreshed = panel("pages").querySelector(`[data-category="${form.dataset.category}"] .admin-status`); if (refreshed) refreshed.textContent = "Cambios guardados correctamente.";
      } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
    }));
    target.querySelector("[data-open-banners]")?.addEventListener("click", () => switchView("banners"));
  };
  const render = (view) => ({ orders: renderOrders, analytics: renderAnalytics, pages: renderPages }[view]?.());
  async function load(refresh = false) {
    try { const fresh = await api(); data = { ...data, ...fresh }; views.forEach((view) => { if (!modules[view].hidden || !refresh) render(view); }); }
    catch (error) { views.forEach((view) => { panel(view).innerHTML = `<p class="admin-empty-inline">${esc(error.message)}</p>`; }); }
  }
  client.auth.getSession().then(({ data: auth }) => { session = auth.session; if (session) load(); });
  document.addEventListener("click", (event) => { if (!event.target.closest("[data-admin-logout]")) return; localStorage.removeItem("kora_admin_last_view"); });
})();
