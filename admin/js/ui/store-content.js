export function mountStoreContent({ root, client, onNavigate, showToast }) {
  const state = { banners: [], categories: [], activeTab: "banners", editingBanner: null, loading: false };
  const placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23f1f2f4'/%3E%3Cpath d='M42 59l18-18 15 14 12-11 31 25H42z' fill='%239ca3af'/%3E%3Ccircle cx='105' cy='31' r='8' fill='%239ca3af'/%3E%3C/svg%3E";
  const node = (tag, className = "", text = "") => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
  };
  const siteUrl = (value) => {
    try { return new URL(String(value || ""), new URL("../", location.href)).href; }
    catch { return placeholder; }
  };
  const image = (src, alt, width = 160, height = 90) => {
    const img = node("img");
    img.src = src ? siteUrl(src) : placeholder;
    img.alt = alt || "";
    img.width = width;
    img.height = height;
    img.loading = "lazy";
    img.onerror = () => { img.onerror = null; img.src = placeholder; };
    return img;
  };
  const field = (labelText, control, helpText = "") => {
    const wrap = node("label", "ds-field");
    wrap.append(node("span", "ds-label", labelText), control);
    if (helpText) wrap.append(node("small", "ds-help", helpText));
    return wrap;
  };
  const input = (type, value = "") => {
    const control = node("input", "ds-input");
    control.type = type;
    if (value !== undefined && value !== null) control.value = String(value);
    return control;
  };
  const selectControl = (items, value) => {
    const control = node("select", "ds-select");
    items.forEach(([label, optionValue]) => {
      const option = node("option", "", label);
      option.value = optionValue;
      if (optionValue === value) option.selected = true;
      control.append(option);
    });
    return control;
  };
  const button = (label, variant = "secondary", action) => {
    const control = node("button", "ds-btn ds-btn--" + variant, label);
    control.type = "button";
    if (action) control.addEventListener("click", action);
    return control;
  };
  const setStatus = (target, message, error = false) => {
    target.textContent = message || "";
    target.className = message ? (error ? "ds-alert ds-alert--danger" : "ds-alert ds-alert--success") : "";
    target.setAttribute("role", error ? "alert" : "status");
  };
  const accessHeaders = async (json = true) => {
    const result = await client.auth.getSession();
    const token = result.data?.session?.access_token;
    if (result.error || !token) throw new Error("La sesión expiró. Vuelve a iniciar sesión en el panel.");
    return { Authorization: "Bearer " + token, ...(json ? { "Content-Type": "application/json" } : {}) };
  };
  const api = async (method = "GET", body) => {
    const endpoint = window.koraEndpoint?.("admin-business", "");
    if (!endpoint) throw new Error("No está configurado el servicio de administración.");
    const response = await fetch(endpoint, { method, headers: await accessHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No fue posible guardar los cambios.");
    return payload;
  };
  const uploadImage = async (file, recordId) => {
    if (!file) return "";
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) throw new Error("Elige una imagen PNG, JPG o WEBP.");
    if (file.size > 8 * 1024 * 1024) throw new Error("La imagen supera el máximo de 8 MB.");
    const endpoint = window.koraEndpoint?.("admin-banner-image", "");
    if (!endpoint) throw new Error("No está configurado el servicio de imágenes.");
    const data = new FormData();
    data.set("id", recordId + "-" + Date.now() + "-" + crypto.randomUUID());
    data.set("image", file);
    const response = await fetch(endpoint, { method: "POST", headers: await accessHeaders(false), body: data });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error || "No fue posible subir la imagen.");
    return payload.url;
  };

  root.replaceChildren();
  const breadcrumb = node("div", "ds-breadcrumb");
  const crumbs = node("ol");
  crumbs.append(node("li", "", "Inicio"));
  const currentCrumb = node("li", "", "Gestión de tienda");
  currentCrumb.setAttribute("aria-current", "page");
  crumbs.append(currentCrumb);
  breadcrumb.append(crumbs);

  const header = node("header", "ds-page-header");
  const heading = node("div");
  heading.append(node("h1", "ds-h1", "Gestión de tienda"), node("p", "", "Edita banners del e-commerce y las imágenes de las categorías del home."));
  header.append(heading);

  const tabs = node("div", "ds-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Contenido de la tienda");
  const bannerTab = node("button", "ds-tab", "Banners");
  bannerTab.type = "button"; bannerTab.setAttribute("role", "tab"); bannerTab.id = "store-banners-tab"; bannerTab.setAttribute("aria-controls", "store-content-panel");
  const categoriesTab = node("button", "ds-tab", "Categorías del home");
  categoriesTab.type = "button"; categoriesTab.setAttribute("role", "tab"); categoriesTab.id = "store-categories-tab"; categoriesTab.setAttribute("aria-controls", "store-content-panel");
  tabs.append(bannerTab, categoriesTab);

  const card = node("section", "ds-card ds-card--flush");
  card.setAttribute("aria-label", "Contenido del sitio");
  const panel = node("div", "ds-card__body");
  panel.id = "store-content-panel"; panel.setAttribute("role", "tabpanel");
  card.append(tabs, panel);
  root.append(breadcrumb, header, card);

  const renderTabs = () => {
    for (const [tab, key] of [[bannerTab, "banners"], [categoriesTab, "categories"]]) {
      const selected = state.activeTab === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
  };
  const renderError = (error) => {
    panel.replaceChildren();
    const alert = node("div", "ds-alert ds-alert--danger", error?.message || "No se pudo cargar el contenido.");
    const retry = button("Reintentar", "secondary", load);
    panel.append(alert, retry);
  };
  const load = async () => {
    state.loading = true;
    panel.replaceChildren(node("div", "ds-skeleton", "Cargando contenido de la tienda…"));
    try {
      const data = await api();
      state.banners = Array.isArray(data.banners) ? data.banners : [];
      state.categories = Array.isArray(data.categories) ? data.categories : [];
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      renderError(error);
    }
  };
  const showTab = (tab) => {
    state.activeTab = tab;
    state.editingBanner = null;
    renderTabs();
    render();
  };
  bannerTab.addEventListener("click", () => showTab("banners"));
  categoriesTab.addEventListener("click", () => showTab("categories"));
  tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const next = state.activeTab === "banners" ? "categories" : "banners";
    (next === "banners" ? bannerTab : categoriesTab).focus();
    showTab(next);
  });

  const render = () => {
    if (state.loading) return;
    renderTabs();
    if (state.activeTab === "banners") renderBanners();
    else renderCategories();
  };

  function renderBanners() {
    panel.replaceChildren();
    const intro = node("p", "ds-text-muted", "Gestiona el banner principal del home y los banners internos de Llaveros y Mascotas. La ubicación y el orden determinan cuál se muestra primero.");
    const toolbar = node("div", "ds-toolbar");
    const count = node("span", "ds-text-muted", state.banners.length + (state.banners.length === 1 ? " banner" : " banners"));
    const create = button("Nuevo banner", "primary", () => { state.editingBanner = null; renderBanners(); });
    toolbar.append(count, create);
    const grid = node("div", "admin-business-grid");
    grid.append(renderBannerForm(state.editingBanner), renderBannerList());
    panel.append(intro, toolbar, grid);
  }

  function renderBannerForm(existing) {
    const form = node("form", "admin-panel ds-stack");
    const heading = node("h2", "ds-h2", existing ? "Editar banner" : "Crear banner");
    const id = input("hidden", existing?.id || "");
    id.type = "hidden";
    const title = input("text", existing?.title || "");
    title.maxLength = 140; title.required = true; title.placeholder = "Ej.: Campaña de temporada";
    const placement = selectControl([["Inicio · banner principal", "home_hero"], ["Catálogo · Llaveros", "llaveros_hero"], ["Catálogo · Mascotas", "mascotas_hero"]], existing?.placement || "home_hero");
    const desktop = input("file"); desktop.accept = "image/png,image/jpeg,image/webp";
    const desktopHelp = node("small", "ds-help", existing?.desktop_image ? "Imagen actual guardada; selecciona otra para reemplazarla." : "Obligatoria. PNG, JPG o WEBP · máximo 8 MB.");
    const mobile = input("file"); mobile.accept = "image/png,image/jpeg,image/webp";
    const mobileHelp = node("small", "ds-help", existing?.mobile_image ? "Imagen móvil actual guardada; selecciona otra para reemplazarla." : "Opcional. Si no la subes, se usará la imagen de escritorio.");
    const alt = input("text", existing?.alt_text || "");
    alt.maxLength = 220; alt.required = true; alt.placeholder = "Describe la imagen para lectores de pantalla";
    const link = input("text", existing?.link_url || "");
    link.maxLength = 500; link.placeholder = "Ej.: hazlotumismo.html";
    const order = input("number", existing?.sort_order ?? 0); order.min = "0"; order.step = "1";
    const activeWrap = node("label", "ds-check");
    const active = input("checkbox");
    active.className = "ds-switch"; active.checked = existing ? Boolean(existing.is_active) : true;
    activeWrap.append(active, node("span", "", "Mostrar banner en el sitio"));

    form.append(heading, id, field("Nombre interno", title), field("Ubicación", placement), field("Imagen de escritorio", desktop, "Si cambias una imagen, la versión anterior dejará de mostrarse en el banner."), desktopHelp, existing?.desktop_image ? image(existing.desktop_image, "Vista previa del banner de escritorio", 240, 135) : document.createDocumentFragment(), field("Imagen móvil", mobile), mobileHelp, existing?.mobile_image ? image(existing.mobile_image, "Vista previa del banner móvil", 160, 200) : document.createDocumentFragment(), field("Texto alternativo", alt), field("Enlace al hacer clic", link), field("Orden de prioridad", order), activeWrap);
    const status = node("p"); status.setAttribute("aria-live", "polite");
    const actions = node("div", "admin-form-actions");
    const reset = button("Limpiar", "secondary", () => { state.editingBanner = null; renderBanners(); });
    const save = node("button", "ds-btn ds-btn--primary", existing ? "Guardar cambios" : "Guardar banner");
    save.type = "submit";
    actions.append(reset, save);
    form.append(actions, status);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      save.disabled = true; save.classList.add("is-loading");
      setStatus(status, "Subiendo imágenes y guardando…");
      try {
        const bannerId = id.value || "banner-" + crypto.randomUUID();
        const desktopUrl = await uploadImage(desktop.files?.[0], bannerId + "-desktop") || existing?.desktop_image || "";
        const mobileUrl = await uploadImage(mobile.files?.[0], bannerId + "-mobile") || existing?.mobile_image || "";
        if (!desktopUrl) throw new Error("Selecciona una imagen de escritorio para crear el banner.");
        await api("POST", { action: "upsert-banner", banner: { id: bannerId, title: title.value, placement: placement.value, desktopImage: desktopUrl, mobileImage: mobileUrl, altText: alt.value, linkUrl: link.value, sortOrder: order.value, isActive: active.checked } });
        state.editingBanner = null;
        await load();
        showToast?.(existing ? "Banner actualizado." : "Banner creado.");
      } catch (error) {
        setStatus(status, error.message || "No se pudo guardar el banner.", true);
      } finally {
        save.disabled = false; save.classList.remove("is-loading");
      }
    });
    return form;
  }

  function renderBannerList() {
    const list = node("section", "admin-panel ds-stack");
    const heading = node("h2", "ds-h2", "Banners guardados");
    list.append(heading);
    if (!state.banners.length) {
      const empty = node("div", "ds-empty");
      empty.append(node("strong", "ds-empty__title", "Aún no hay banners"), node("p", "", "Crea uno para actualizar el inicio o una portada de catálogo."));
      list.append(empty);
      return list;
    }
    const locations = { home_hero: "Inicio · banner principal", llaveros_hero: "Catálogo · Llaveros", mascotas_hero: "Catálogo · Mascotas" };
    state.banners.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((banner) => {
      const row = node("article", "ds-card ds-card__body");
      const rowGrid = node("div", "admin-section-head");
      const info = node("div", "ds-stack");
      const thumb = image(banner.desktop_image, banner.alt_text, 160, 90);
      const name = node("strong", "", banner.title);
      name.title = banner.title;
      const details = node("small", "ds-text-muted", (locations[banner.placement] || banner.placement) + " · " + (banner.is_active ? "Activo" : "Pausado") + " · Orden " + Number(banner.sort_order || 0));
      info.append(name, details);
      const actions = node("div", "admin-row-actions");
      actions.append(button("Editar", "secondary", () => { state.editingBanner = banner; renderBanners(); }));
      actions.append(button("Eliminar", "danger", async () => {
        if (!window.confirm("¿Eliminar el banner “" + banner.title + "”? Dejará de mostrarse en el sitio.")) return;
        try {
          await api("POST", { action: "delete-banner", id: banner.id });
          await load();
          showToast?.("Banner eliminado.");
        } catch (error) { window.alert(error.message || "No se pudo eliminar el banner."); }
      }));
      rowGrid.append(thumb, info, actions);
      row.append(rowGrid);
      list.append(row);
    });
    return list;
  }

  function renderCategories() {
    panel.replaceChildren();
    const intro = node("p", "ds-text-muted", "Estas imágenes corresponden a las tarjetas de categorías del home. Los espacios son fijos; puedes cambiar su imagen, texto, destino y visibilidad.");
    const grid = node("div", "ds-grid");
    if (!state.categories.length) {
      const empty = node("div", "ds-empty ds-card");
      empty.append(node("strong", "ds-empty__title", "No se recibieron categorías"), node("p", "", "Revisa que el contenido del sitio esté instalado en Supabase."));
      panel.append(intro, empty);
      return;
    }
    state.categories.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((category) => grid.append(renderCategoryForm(category)));
    panel.append(intro, grid);
  }

  function renderCategoryForm(category) {
    const form = node("form", "admin-panel ds-stack");
    const titleHeading = node("h2", "ds-h2", category.title || category.id);
    titleHeading.title = category.title || category.id;
    const preview = node("div", "ds-product__media");
    preview.append(image(category.image_url, category.alt_text, 240, 150));
    const title = input("text", category.title || ""); title.maxLength = 100; title.required = true;
    const actionLabel = input("text", category.action_label || "Descubrir"); actionLabel.maxLength = 60;
    const file = input("file"); file.accept = "image/png,image/jpeg,image/webp";
    const alt = input("text", category.alt_text || ""); alt.maxLength = 220; alt.required = true;
    const href = input("text", category.href || ""); href.maxLength = 500; href.required = true;
    const order = input("number", category.sort_order ?? 0); order.min = "0"; order.step = "1";
    const activeLine = node("label", "ds-check");
    const active = input("checkbox"); active.className = "ds-switch"; active.checked = Boolean(category.is_active);
    activeLine.append(active, node("span", "", "Visible en el home"));
    const status = node("p"); status.setAttribute("aria-live", "polite");
    const save = node("button", "ds-btn ds-btn--primary", "Guardar cambios"); save.type = "submit";
    form.append(titleHeading, preview, field("Título", title), field("Texto del botón", actionLabel), field("Cambiar imagen", file, "PNG, JPG o WEBP · máximo 8 MB."), field("Texto alternativo", alt), field("Destino", href), field("Orden", order), activeLine, save, status);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      save.disabled = true; save.classList.add("is-loading"); setStatus(status, "Guardando categoría…");
      try {
        const imageUrl = await uploadImage(file.files?.[0], "category-" + category.id) || category.image_url;
        await api("POST", { action: "upsert-home-category", category: { id: category.id, title: title.value, actionLabel: actionLabel.value, imageUrl, altText: alt.value, href: href.value, sortOrder: order.value, isActive: active.checked } });
        await load();
        showToast?.("Categoría del home actualizada.");
      } catch (error) { setStatus(status, error.message || "No se pudo guardar la categoría.", true); }
      finally { save.disabled = false; save.classList.remove("is-loading"); }
    });
    return form;
  }

  renderTabs();
  load();
}
