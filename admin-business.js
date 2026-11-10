(() => {
  const config = window.KORA_CONFIG || {};
  const client = config.supabaseUrl && config.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const endpoint = (name) => window.koraEndpoint?.(name, "") || "";
  const lastViewKey = "kora_admin_last_view";
  const availableViews = new Set(["overview", "tasks", "banners", "finance", "products", "orders", "analytics", "pages"]);
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const today = () => new Date().toISOString().slice(0, 10);
  const state = { session: null, banners: [], accounts: [], entries: [], quotes: [], tasks: [], bannerImages: { desktop: "", mobile: "" }, captureImageUrl: "", captureVersion: 0, taskImagePath: "", taskImageName: "", taskPreviewUrl: "" };
  let started = false;

  const ui = {
    app: $("#admin-app"), nav: document.querySelectorAll("[data-admin-view]"), modules: document.querySelectorAll(".admin-module"),
    overview: $("#admin-overview-view"), products: $("#admin-dashboard-view"), editor: $("#admin-editor-view"), colors: $("#admin-global-colors"),
    bannerForm: $("#admin-banner-form"), bannerId: $("#admin-banner-id"), bannerTitle: $("#admin-banner-title"), bannerPlacement: $("#admin-banner-placement"), bannerDesktop: $("#admin-banner-desktop"), bannerMobile: $("#admin-banner-mobile"), bannerDesktopName: $("#admin-banner-desktop-name"), bannerMobileName: $("#admin-banner-mobile-name"), bannerAlt: $("#admin-banner-alt"), bannerLink: $("#admin-banner-link"), bannerOrder: $("#admin-banner-order"), bannerActive: $("#admin-banner-active"), bannerReset: $("#admin-banner-reset"), bannerList: $("#admin-banner-list"), bannerCount: $("#admin-banner-count"), bannerStatus: $("#admin-banner-status"),
    entryForm: $("#admin-entry-form"), entryType: $("#admin-entry-type"), entryCategory: $("#admin-entry-category"), entryAmount: $("#admin-entry-amount"), entryDate: $("#admin-entry-date"), entryAccount: $("#admin-entry-account"), entryMethod: $("#admin-entry-method"), entryReference: $("#admin-entry-reference"), entryNote: $("#admin-entry-note"), entryStatus: $("#admin-entry-status"), entryList: $("#admin-entry-list"), entryCount: $("#admin-entry-count"),
    captureImage: $("#admin-entry-image"), capturePreview: $("#finance-capture-preview"), capturePreviewImage: $("#finance-capture-preview-image"), captureRemove: $("#finance-capture-remove"), captureStatus: $("#finance-capture-status"), captureText: $("#finance-capture-text"), captureRawText: $("#finance-capture-raw-text"),
    accountForm: $("#admin-account-form"), accountBank: $("#admin-account-bank"), accountAlias: $("#admin-account-alias"), accountLastFour: $("#admin-account-last-four"), accountStatus: $("#admin-account-status"), accountList: $("#admin-account-list"),
    taskForm: $("#admin-task-form"), taskId: $("#admin-task-id"), taskTitle: $("#admin-task-title"), taskCustomer: $("#admin-task-customer"), taskReference: $("#admin-task-reference"), taskDate: $("#admin-task-date"), taskProductType: $("#admin-task-product-type"), taskPaymentStatus: $("#admin-task-payment-status"), taskDeliveryStatus: $("#admin-task-delivery-status"), taskNotes: $("#admin-task-notes"), taskImage: $("#admin-task-image"), taskPreview: $("#admin-task-image-preview"), taskPreviewImage: $("#admin-task-image-preview-image"), taskImageRemove: $("#admin-task-image-remove"), taskFormTitle: $("#admin-task-form-title"), taskMessage: $("#admin-task-status-message"), taskLists: { pending: $("#admin-task-list-pending"), in_progress: $("#admin-task-list-in-progress"), done: $("#admin-task-list-done") }, taskCounts: { pending: $("#admin-task-count-pending"), in_progress: $("#admin-task-count-in-progress"), done: $("#admin-task-count-done") }
  };

  const status = (element, message, tone = "") => { element.textContent = message; element.className = `admin-status${tone ? ` is-${tone}` : ""}`; };
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${state.session.access_token}` });
  const api = async (method = "GET", body) => {
    const response = await fetch(endpoint("admin-business"), { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible completar la acción");
    return payload;
  };
  const activeView = (view) => {
    document.querySelectorAll("[data-admin-view]").forEach((button) => button.classList.toggle("active", button.dataset.adminView === view));
  };
  const showView = (view) => {
    const selectedView = availableViews.has(view) ? view : "overview";
    ui.modules.forEach((module) => { if (module.id !== "admin-editor-view") module.hidden = true; });
    ui.colors.hidden = true;
    ui.editor.hidden = true;
    document.body.classList.remove("admin-is-editor");
    const target = selectedView === "products" ? ui.products : $(`#admin-${selectedView}-view`);
    if (target) target.hidden = false;
    localStorage.setItem(lastViewKey, selectedView);
    activeView(selectedView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const financeTotals = (entries = state.entries) => entries.reduce((totals, entry) => {
    totals[entry.entry_type] += Number(entry.amount || 0); return totals;
  }, { income: 0, expense: 0 });

  const renderMetrics = () => {
    const current = state.entries.filter((entry) => entry.occurred_on >= monthStart()); const totals = financeTotals(current); const balance = totals.income - totals.expense;
    $("#admin-metric-income").textContent = money(totals.income); $("#admin-metric-expense").textContent = money(totals.expense); $("#admin-metric-balance").textContent = money(balance);
    $("#admin-metric-income-note").textContent = `${current.filter((entry) => entry.entry_type === "income").length} ingresos este mes`;
    $("#admin-metric-expense-note").textContent = `${current.filter((entry) => entry.entry_type === "expense").length} gastos este mes`;
    $("#admin-metric-balance-note").textContent = balance >= 0 ? "Resultado positivo" : "Revisa los gastos registrados";
    $("#admin-metric-quotes").textContent = String(state.quotes.filter((quote) => ["draft", "sent"].includes(quote.status)).length);
  };
  const renderChart = () => {
    const chart = $("#admin-finance-chart"); const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); return date; });
    const records = months.map((date) => { const key = date.toISOString().slice(0, 7); const totals = financeTotals(state.entries.filter((entry) => String(entry.occurred_on).startsWith(key))); return { label: date.toLocaleDateString("es-CO", { month: "short" }).replace(".", ""), ...totals }; });
    const max = Math.max(1, ...records.flatMap((record) => [record.income, record.expense]));
    chart.innerHTML = records.map((record) => `<div class="admin-chart-column"><div class="admin-chart-bars"><span class="income" style="height:${Math.max(3, record.income / max * 100)}%" title="Ingresos ${money(record.income)}"></span><span class="expense" style="height:${Math.max(3, record.expense / max * 100)}%" title="Gastos ${money(record.expense)}"></span></div><small>${esc(record.label)}</small></div>`).join("");
  };
  const renderBanners = () => {
    ui.bannerCount.textContent = String(state.banners.length);
    ui.bannerList.innerHTML = state.banners.length ? state.banners.map((banner) => `<article class="admin-banner-item"><img src="${esc(banner.desktop_image)}" alt="" /><div><strong>${esc(banner.title)}</strong><span>${esc(banner.placement.replace("_", " "))} · ${banner.is_active ? "Activo" : "Pausado"}</span></div><div class="admin-row-actions"><button type="button" class="ds-btn ds-btn--secondary ds-btn--icon ds-btn--sm" data-banner-edit="${esc(banner.id)}" title="Editar">✎</button><button class="ds-btn ds-btn--danger ds-btn--icon ds-btn--sm delete" type="button" data-banner-delete="${esc(banner.id)}" title="Eliminar">×</button></div></article>`).join("") : '<p class="admin-empty-inline">Aún no hay banners guardados.</p>';
  };
  const renderAccounts = () => {
    ui.entryAccount.innerHTML = '<option value="">Sin cuenta asociada</option>' + state.accounts.filter((account) => account.is_active).map((account) => `<option value="${esc(account.id)}">${esc(account.account_alias)}${account.account_last_four ? ` · ${esc(account.account_last_four)}` : ""}</option>`).join("");
    ui.accountList.innerHTML = state.accounts.length ? state.accounts.map((account) => `<div class="admin-account-item"><strong>${esc(account.account_alias)}</strong><span>${esc(account.bank_name)}${account.account_last_four ? ` · **** ${esc(account.account_last_four)}` : ""}</span></div>`).join("") : '<p class="admin-empty-inline">No hay cuentas de referencia.</p>';
  };
  const renderEntries = () => {
    const totals = financeTotals(); const balance = totals.income - totals.expense;
    $("#admin-finance-income").textContent = money(totals.income); $("#admin-finance-expense").textContent = money(totals.expense); $("#admin-finance-balance").textContent = money(balance); ui.entryCount.textContent = String(state.entries.length);
    ui.entryList.innerHTML = state.entries.length ? state.entries.slice(0, 30).map((entry) => `<article class="admin-ledger-row"><div><strong>${esc(entry.category)}</strong><span>${esc(entry.occurred_on)}${entry.reference ? ` · ${esc(entry.reference)}` : ""}</span></div><div><b class="${entry.entry_type}">${entry.entry_type === "income" ? "+" : "−"}${money(entry.amount)}</b><button class="ds-btn ds-btn--danger ds-btn--sm admin-text-delete" type="button" data-entry-delete="${esc(entry.id)}">Eliminar</button></div></article>`).join("") : '<p class="admin-empty-inline">Aún no hay movimientos.</p>';
  };
  const taskStateLabel = (taskStatus) => ({ pending: "Pendiente", in_progress: "En proceso", done: "Finalizado" }[taskStatus] || "Pendiente");
  const taskProductLabel = (type) => type === "pet" ? "Llavero mascotas" : "Llavero personalizado";
  const taskPaymentLabel = (statusValue) => statusValue === "paid" ? "Pagado" : "Debe";
  const taskDeliveryLabel = (statusValue) => statusValue === "cash_on_delivery" ? "Contraentrega" : "Por enviar";
  const renderTasks = () => {
    ["pending", "in_progress", "done"].forEach((taskStatus) => {
      const tasks = state.tasks.filter((task) => task.status === taskStatus); ui.taskCounts[taskStatus].textContent = String(tasks.length);
      ui.taskLists[taskStatus].innerHTML = tasks.length ? tasks.map((task) => `<article class="admin-task-card" draggable="true" tabindex="0" data-task-id="${esc(task.id)}"><div class="admin-task-card-head"><h4>${esc(task.title)}</h4><div class="admin-task-card-actions"><button class="ds-btn ds-btn--secondary ds-btn--sm admin-task-edit" type="button" data-task-edit="${esc(task.id)}">Editar</button><button class="ds-btn ds-btn--danger ds-btn--sm admin-task-delete" type="button" data-task-delete="${esc(task.id)}" aria-label="Eliminar tarea">×</button></div></div><div class="admin-task-tags"><span class="task-tag type-${esc(task.product_type || "personalized")}">${esc(taskProductLabel(task.product_type))}</span><span class="task-tag payment-${esc(task.payment_status || "due")}">${esc(taskPaymentLabel(task.payment_status))}</span><span class="task-tag delivery-${esc(task.delivery_status || "shipping")}">${esc(taskDeliveryLabel(task.delivery_status))}</span></div><div class="admin-task-card-body${task.reference_image_url ? "" : " no-image"}">${task.reference_image_url ? `<img src="${esc(task.reference_image_url)}" alt="Referencia de ${esc(task.title)}" />` : ""}<div>${task.customer_name ? `<p class="task-customer">${esc(task.customer_name)}</p>` : ""}${task.order_reference ? `<p class="task-reference">${esc(task.order_reference)}</p>` : ""}${task.notes ? `<p class="task-note">${esc(task.notes)}</p>` : ""}</div></div><footer><time>${task.due_date ? `Entrega: ${esc(task.due_date)}` : "Sin fecha"}</time><select data-task-status="${esc(task.id)}" aria-label="Estado de ${esc(task.title)}"><option value="pending"${task.status === "pending" ? " selected" : ""}>Pendiente</option><option value="in_progress"${task.status === "in_progress" ? " selected" : ""}>En proceso</option><option value="done"${task.status === "done" ? " selected" : ""}>Finalizado</option></select></footer></article>`).join("") : '<p class="admin-kanban-empty">Arrastra aquí una tarea o crea un pedido nuevo.</p>';
    });
  };
  const render = () => { renderMetrics(); renderChart(); renderBanners(); renderAccounts(); renderEntries(); renderTasks(); };
  const load = async () => { const data = await api(); state.banners = data.banners || []; state.accounts = data.accounts || []; state.entries = data.entries || []; state.quotes = data.quotes || []; state.tasks = data.tasks || []; render(); };
  const uploadBanner = async (file, suffix) => {
    if (!file) return "";
    const data = new FormData(); data.set("id", `${ui.bannerId.value || crypto.randomUUID()}-${suffix}`); data.set("image", file);
    const response = await fetch(endpoint("admin-banner-image"), { method: "POST", headers: { Authorization: `Bearer ${state.session.access_token}` }, body: data }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No fue posible subir la imagen"); return payload.url;
  };
  const resetBanner = () => { ui.bannerForm.reset(); ui.bannerId.value = ""; ui.bannerOrder.value = "0"; ui.bannerActive.checked = true; state.bannerImages = { desktop: "", mobile: "" }; ui.bannerDesktopName.textContent = "PNG, JPG o WEBP. Máximo 8 MB."; ui.bannerMobileName.textContent = "Opcional; se recomienda formato vertical."; status(ui.bannerStatus, ""); };
  const formatDate = (year, month, day) => {
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const detectedDate = (text) => {
    const iso = text.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
    if (iso) return formatDate(iso[1], iso[2], iso[3]);
    const local = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
    return local ? formatDate(local[3], local[2], local[1]) : "";
  };
  const copValue = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const amount = Number(digits);
    return amount >= 100 && amount <= 100000000 ? amount : 0;
  };
  const detectedAmount = (text) => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const ranked = [];
    lines.forEach((line) => {
      const matches = line.match(/(?:\$\s*)?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\$\s*\d{4,8}/g) || [];
      matches.forEach((match) => {
        const amount = copValue(match);
        if (!amount) return;
        let score = 1;
        if (/total|valor|pagado|pago|monto|importe|transacci[oó]n|recibiste|envi(?:aste|ado)/i.test(line)) score += 4;
        if (/subtotal|iva|comisi[oó]n|saldo/i.test(line)) score -= 2;
        ranked.push({ amount, score });
      });
    });
    ranked.sort((a, b) => b.score - a.score || b.amount - a.amount);
    return ranked[0]?.amount || 0;
  };
  const detectedPaymentMethod = (text) => {
    const options = [[/nequi/i, "Nequi"], [/daviplata/i, "Daviplata"], [/bancolombia/i, "Bancolombia"], [/wompi/i, "Wompi"], [/mercado\s*pago/i, "Mercado Pago"], [/efectivo/i, "Efectivo"]];
    return options.find(([pattern]) => pattern.test(text))?.[1] || "";
  };
  const detectedCategory = (text) => {
    const options = [[/env[ií]a|env[ií]o|mensajer[ií]a|domicilio/i, "Envíos"], [/meta|facebook|instagram|google ads|publicidad/i, "Publicidad"], [/wompi|mercado\s*pago|comisi[oó]n/i, "Comisiones Wompi"], [/resina|filamento|material|insumo/i, "Materiales"], [/venta|pedido|cliente|pago recibido/i, "Ventas"]];
    return options.find(([pattern]) => pattern.test(text))?.[1] || "Otros";
  };
  const detectedReference = (text) => text.split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length >= 4 && line.length <= 90 && !/^\d+[\d\s.,/$-]*$/.test(line) && !/fecha|total|valor|monto|transacci[oó]n|comprobante|aprobada|exitosa/i.test(line)) || "";
  const resetCapture = () => {
    state.captureVersion += 1;
    if (state.captureImageUrl) URL.revokeObjectURL(state.captureImageUrl);
    state.captureImageUrl = ""; ui.captureImage.value = ""; ui.capturePreview.hidden = true; ui.capturePreviewImage.removeAttribute("src"); ui.captureText.hidden = true; ui.captureText.open = false; ui.captureRawText.value = ""; status(ui.captureStatus, "");
  };
  const applyCaptureDraft = (rawText) => {
    const amount = detectedAmount(rawText); const date = detectedDate(rawText); const method = detectedPaymentMethod(rawText); const category = detectedCategory(rawText); const reference = detectedReference(rawText);
    if (amount) ui.entryAmount.value = String(amount);
    if (date) ui.entryDate.value = date;
    if (method) ui.entryMethod.value = method;
    if (category) ui.entryCategory.value = category;
    if (reference) ui.entryReference.value = reference;
    if (/recibiste|pago recibido|consignaci[oó]n|abono|venta/i.test(rawText)) ui.entryType.value = "income";
    ui.captureRawText.value = rawText.trim(); ui.captureText.hidden = !rawText.trim();
    const missing = [amount ? "" : "valor", date ? "" : "fecha"].filter(Boolean);
    status(ui.captureStatus, missing.length ? `Revisa el ${missing.join(" y ")} antes de guardar.` : "Datos sugeridos. Revísalos antes de guardar.", "success");
  };
  const readCapture = async (file) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { status(ui.captureStatus, "Usa una imagen PNG, JPG o WEBP de hasta 8 MB.", "error"); return; }
    resetCapture();
    const captureVersion = state.captureVersion;
    state.captureImageUrl = URL.createObjectURL(file); ui.capturePreviewImage.src = state.captureImageUrl; ui.capturePreview.hidden = false;
    if (!window.Tesseract) { status(ui.captureStatus, "No fue posible iniciar el lector. Puedes completar el movimiento manualmente.", "error"); return; }
    try {
      status(ui.captureStatus, "Leyendo imagen...");
      const result = await window.Tesseract.recognize(file, "spa+eng", { logger: (message) => {
        if (message.status === "recognizing text" && Number.isFinite(message.progress)) status(ui.captureStatus, `Leyendo imagen... ${Math.round(message.progress * 100)}%`);
      } });
      if (captureVersion !== state.captureVersion) return;
      applyCaptureDraft(result.data.text || "");
    } catch (error) { status(ui.captureStatus, "No pudimos leer esta imagen. Puedes registrar el movimiento manualmente.", "error"); }
  };
  const resetTaskForm = () => {
    if (state.taskPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(state.taskPreviewUrl);
    state.taskImagePath = ""; state.taskImageName = ""; state.taskPreviewUrl = "";
    ui.taskForm.reset(); ui.taskId.value = ""; ui.taskFormTitle.textContent = "Nuevo pedido"; ui.taskPreview.hidden = true; ui.taskPreviewImage.removeAttribute("src"); status(ui.taskMessage, "");
  };
  const openTaskForm = (task) => {
    resetTaskForm(); ui.taskForm.hidden = false;
    if (!task) { ui.taskTitle.focus(); return; }
    ui.taskFormTitle.textContent = "Editar pedido"; ui.taskId.value = task.id; ui.taskTitle.value = task.title; ui.taskCustomer.value = task.customer_name || ""; ui.taskReference.value = task.order_reference || ""; ui.taskDate.value = task.due_date || ""; ui.taskProductType.value = task.product_type || "personalized"; ui.taskPaymentStatus.value = task.payment_status || "due"; ui.taskDeliveryStatus.value = task.delivery_status || "shipping"; ui.taskNotes.value = task.notes || ""; state.taskImagePath = task.reference_image_path || ""; state.taskImageName = task.reference_image_name || ""; state.taskPreviewUrl = task.reference_image_url || "";
    if (state.taskPreviewUrl) { ui.taskPreviewImage.src = state.taskPreviewUrl; ui.taskPreview.hidden = false; }
    ui.taskTitle.focus(); ui.taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const uploadTaskImage = async (file, taskId) => {
    if (!file) return { path: state.taskImagePath, name: state.taskImageName };
    const form = new FormData(); form.set("id", taskId); form.set("image", file);
    const response = await fetch(endpoint("admin-task-image"), { method: "POST", headers: { Authorization: `Bearer ${state.session.access_token}` }, body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible subir la imagen");
    return { path: payload.path || "", name: payload.name || file.name };
  };
  const moveTask = async (taskId, taskStatus) => {
    const task = state.tasks.find((item) => item.id === taskId); if (!task || task.status === taskStatus) return;
    try { await api("POST", { action: "update-task-status", id: taskId, status: taskStatus }); await load(); } catch (error) { window.alert(error.message); }
  };

  const bind = () => {
    ui.nav.forEach((button) => button.addEventListener("click", () => showView(button.dataset.adminView)));
    document.querySelectorAll("[data-admin-logout]").forEach((button) => button.addEventListener("click", async () => { localStorage.removeItem(lastViewKey); await client.auth.signOut({ scope: "local" }); window.location.replace("acceso-kora.html"); }));
    $("#admin-create-button")?.addEventListener("click", () => activeView("products")); $("#admin-cancel")?.addEventListener("click", () => activeView("products"));
    ui.bannerDesktop.addEventListener("change", () => { ui.bannerDesktopName.textContent = ui.bannerDesktop.files?.[0]?.name || "PNG, JPG o WEBP. Máximo 8 MB."; });
    ui.bannerMobile.addEventListener("change", () => { ui.bannerMobileName.textContent = ui.bannerMobile.files?.[0]?.name || "Opcional; se recomienda formato vertical."; });
    ui.bannerReset.addEventListener("click", resetBanner);
    ui.bannerForm.addEventListener("submit", async (event) => { event.preventDefault(); status(ui.bannerStatus, "Subiendo imágenes y guardando..."); try { const desktop = await uploadBanner(ui.bannerDesktop.files?.[0], "desktop") || state.bannerImages.desktop; const mobile = await uploadBanner(ui.bannerMobile.files?.[0], "mobile") || state.bannerImages.mobile; await api("POST", { action: "upsert-banner", banner: { id: ui.bannerId.value, title: ui.bannerTitle.value, placement: ui.bannerPlacement.value, desktopImage: desktop, mobileImage: mobile, altText: ui.bannerAlt.value, linkUrl: ui.bannerLink.value, sortOrder: ui.bannerOrder.value, isActive: ui.bannerActive.checked } }); await load(); resetBanner(); status(ui.bannerStatus, "Banner guardado correctamente.", "success"); } catch (error) { status(ui.bannerStatus, error.message, "error"); } });
    ui.bannerList.addEventListener("click", async (event) => { const edit = event.target.closest("[data-banner-edit]"); const remove = event.target.closest("[data-banner-delete]"); if (edit) { const banner = state.banners.find((item) => item.id === edit.dataset.bannerEdit); if (!banner) return; ui.bannerId.value = banner.id; ui.bannerTitle.value = banner.title; ui.bannerPlacement.value = banner.placement; ui.bannerAlt.value = banner.alt_text; ui.bannerLink.value = banner.link_url || ""; ui.bannerOrder.value = banner.sort_order; ui.bannerActive.checked = banner.is_active; state.bannerImages = { desktop: banner.desktop_image, mobile: banner.mobile_image || "" }; ui.bannerDesktopName.textContent = "Imagen actual guardada. Selecciona otra para reemplazarla."; ui.bannerMobileName.textContent = banner.mobile_image ? "Imagen móvil actual guardada. Selecciona otra para reemplazarla." : "Opcional; se recomienda formato vertical."; window.scrollTo({ top: 0, behavior: "smooth" }); } if (remove && window.confirm("¿Eliminar este banner?")) { try { await api("POST", { action: "delete-banner", id: remove.dataset.bannerDelete }); await load(); } catch (error) { status(ui.bannerStatus, error.message, "error"); } } });
    ui.accountForm.addEventListener("submit", async (event) => { event.preventDefault(); status(ui.accountStatus, "Guardando..."); try { await api("POST", { action: "upsert-account", account: { bankName: ui.accountBank.value, accountAlias: ui.accountAlias.value, accountLastFour: ui.accountLastFour.value } }); ui.accountForm.reset(); await load(); status(ui.accountStatus, "Cuenta guardada.", "success"); } catch (error) { status(ui.accountStatus, error.message, "error"); } });
    ui.captureImage.addEventListener("change", () => readCapture(ui.captureImage.files?.[0]));
    ui.captureRemove.addEventListener("click", resetCapture);
    ui.entryForm.addEventListener("submit", async (event) => { event.preventDefault(); status(ui.entryStatus, "Guardando..."); try { await api("POST", { action: "upsert-entry", entry: { entryType: ui.entryType.value, category: ui.entryCategory.value, amount: ui.entryAmount.value, occurredOn: ui.entryDate.value, accountId: ui.entryAccount.value, paymentMethod: ui.entryMethod.value, reference: ui.entryReference.value, note: ui.entryNote.value } }); ui.entryForm.reset(); resetCapture(); ui.entryDate.value = today(); await load(); status(ui.entryStatus, "Movimiento guardado.", "success"); } catch (error) { status(ui.entryStatus, error.message, "error"); } });
    ui.entryList.addEventListener("click", async (event) => { const remove = event.target.closest("[data-entry-delete]"); if (!remove || !window.confirm("¿Eliminar este movimiento?")) return; try { await api("POST", { action: "delete-entry", id: remove.dataset.entryDelete }); await load(); } catch (error) { status(ui.entryStatus, error.message, "error"); } });
    $("#admin-task-new").addEventListener("click", () => openTaskForm());
    $("#admin-task-cancel").addEventListener("click", () => { resetTaskForm(); ui.taskForm.hidden = true; });
    $("#admin-task-reset").addEventListener("click", resetTaskForm);
    ui.taskImage.addEventListener("change", () => { const file = ui.taskImage.files?.[0]; if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { status(ui.taskMessage, "Usa una imagen PNG, JPG o WEBP de hasta 8 MB.", "error"); ui.taskImage.value = ""; return; } if (state.taskPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(state.taskPreviewUrl); state.taskPreviewUrl = URL.createObjectURL(file); ui.taskPreviewImage.src = state.taskPreviewUrl; ui.taskPreview.hidden = false; });
    ui.taskImageRemove.addEventListener("click", () => { if (state.taskPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(state.taskPreviewUrl); state.taskPreviewUrl = ""; state.taskImagePath = ""; state.taskImageName = ""; ui.taskImage.value = ""; ui.taskPreview.hidden = true; ui.taskPreviewImage.removeAttribute("src"); });
    ui.taskForm.addEventListener("submit", async (event) => { event.preventDefault(); status(ui.taskMessage, "Guardando tarea..."); try { const taskId = ui.taskId.value || crypto.randomUUID(); const image = await uploadTaskImage(ui.taskImage.files?.[0], taskId); const current = state.tasks.find((item) => item.id === taskId); await api("POST", { action: "upsert-task", task: { id: taskId, title: ui.taskTitle.value, customerName: ui.taskCustomer.value, orderReference: ui.taskReference.value, dueDate: ui.taskDate.value, productType: ui.taskProductType.value, paymentStatus: ui.taskPaymentStatus.value, deliveryStatus: ui.taskDeliveryStatus.value, notes: ui.taskNotes.value, status: current?.status || "pending", referenceImagePath: image.path, referenceImageName: image.name } }); await load(); resetTaskForm(); ui.taskForm.hidden = true; } catch (error) { status(ui.taskMessage, error.message, "error"); } });
    $("#admin-kanban").addEventListener("click", async (event) => { const edit = event.target.closest("[data-task-edit]"); const remove = event.target.closest("[data-task-delete]"); if (edit) { const task = state.tasks.find((item) => item.id === edit.dataset.taskEdit); if (task) openTaskForm(task); } if (remove && window.confirm("¿Eliminar esta tarea?")) { try { await api("POST", { action: "delete-task", id: remove.dataset.taskDelete }); await load(); } catch (error) { window.alert(error.message); } } });
    $("#admin-kanban").addEventListener("change", (event) => { const select = event.target.closest("[data-task-status]"); if (select) moveTask(select.dataset.taskStatus, select.value); });
    $("#admin-kanban").addEventListener("dragstart", (event) => { const card = event.target.closest("[data-task-id]"); if (!card) return; card.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", card.dataset.taskId); });
    $("#admin-kanban").addEventListener("dragend", (event) => { event.target.closest("[data-task-id]")?.classList.remove("is-dragging"); document.querySelectorAll("[data-task-dropzone]").forEach((column) => column.classList.remove("is-dragover")); });
    document.querySelectorAll("[data-task-dropzone]").forEach((column) => { column.addEventListener("dragover", (event) => { event.preventDefault(); column.classList.add("is-dragover"); }); column.addEventListener("dragleave", () => column.classList.remove("is-dragover")); column.addEventListener("drop", (event) => { event.preventDefault(); column.classList.remove("is-dragover"); moveTask(event.dataTransfer.getData("text/plain"), column.dataset.taskDropzone); }); });
  };
  const start = async () => {
    if (started || !client || ui.app.hidden) return; started = true;
    const { data } = await client.auth.getSession(); if (!data.session) return; state.session = data.session; ui.entryDate.value = today(); bind();
    try { await load(); showView(localStorage.getItem(lastViewKey) || "overview"); } catch (error) { console.error(error); }
  };
  if (ui.app) { new MutationObserver(start).observe(ui.app, { attributes: true, attributeFilter: ["hidden"] }); if (!ui.app.hidden) start(); }
})();
