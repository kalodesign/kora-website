(() => {
  const config = window.KORA_CONFIG || {};
  const client = config.supabaseUrl && config.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const endpoint = (name) => window.koraEndpoint?.(name, "") || "";
  const privateDoor = "acceso-kora.html?destino=productos";
  const lastViewKey = "kora_admin_last_view";
  const state = { products: [], session: null, components: [], manualColors: [], globalColors: [], productImages: [], page: 1, perPage: 10 };
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    loading: $("#admin-loading"), app: $("#admin-app"), user: $("#admin-user"), logout: $("#admin-logout"),
    dashboard: $("#admin-dashboard-view"), editor: $("#admin-editor-view"), create: $("#admin-create-button"), cancel: $("#admin-cancel"),
    form: $("#product-admin-form"), formTitle: $("#admin-form-title"), submit: $("#admin-submit"), reset: $("#admin-reset"), id: $("#admin-product-id"), title: $("#admin-title"), category: $("#admin-category"),
    type: $("#admin-product-type"), custom: $("#admin-custom"), image: $("#admin-image"), imagesFile: $("#admin-images-file"), imageList: $("#admin-image-list"), imageStatus: $("#admin-image-status"),
    description: $("#admin-description"), size: $("#admin-size"), material: $("#admin-material"), customMaterial: $("#admin-material-custom"), customMaterialField: $("#admin-material-custom-field"), stock: $("#admin-stock"), price: $("#admin-price"), compare: $("#admin-compare"),
    tags: $("#admin-tags"), active: $("#admin-active"), productComponents: $("#admin-product-components"), components: $("#admin-components"), addComponent: $("#admin-add-component"), componentPicker: $("#admin-component-picker"), componentSearch: $("#admin-component-search"), componentCatalog: $("#admin-component-catalog"), closeComponentPicker: $("#admin-close-component-picker"),
    list: $("#admin-products-list"), count: $("#admin-product-count"), status: $("#admin-status"), listStatus: $("#admin-list-status"), pagination: $("#admin-pagination"),
    search: $("#admin-search"), filterCategory: $("#admin-filter-category"), filterOrigin: $("#admin-filter-origin"), filterStatus: $("#admin-filter-status"), filterPrice: $("#admin-filter-price"),
    colorsPanel: $("#admin-global-colors"), colorsButton: $("#admin-colors-button"), colorsClose: $("#admin-global-colors-close"), globalColorsList: $("#admin-global-colors-list"),
    addGlobalColor: $("#admin-add-global-color"), saveGlobalColors: $("#admin-save-global-colors"), globalColorsStatus: $("#admin-global-colors-status"),
    manualColorsList: $("#admin-manual-colors-list"), addManualColor: $("#admin-add-manual-color"), colorHelp: $("#admin-color-help")
  };

  const slugify = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const normalizeSearch = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const money = (value) => Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const categoryFor = (type) => ({ dije: "Dijes", kit: "Kits", a_medida: "Llaveros" }[type] || "Dijes");
  const isPelgyProduct = (product) => String(product?.id || "").startsWith("catalogo-") || (product?.tags || []).some((tag) => /^(pelgy|catalogo)$/i.test(String(tag).trim()));
  const productOriginLabel = (product) => isPelgyProduct(product) ? "Otros" : "Kora Studio";
  const selectedProductType = () => {
    if (ui.custom.checked) return "a_medida";
    return /^(kits?|sets?)$/i.test(ui.category.value.trim()) ? "kit" : "dije";
  };
  const materialValue = () => ui.material.value === "other" ? ui.customMaterial.value.trim() : ui.material.value;
  const updateMaterialInput = () => {
    const isCustom = ui.material.value === "other";
    ui.customMaterialField.hidden = !isCustom;
    ui.customMaterial.required = isCustom;
  };
  const restoreMaterial = (value) => {
    const savedMaterial = String(value || "").trim();
    const presetMaterials = {
      biocompostable: "Biocompostable",
      biodegradable: "Biocompostable",
      resina: "Resina"
    };
    const preset = presetMaterials[normalizeSearch(savedMaterial)];
    ui.material.value = preset || (savedMaterial ? "other" : "");
    ui.customMaterial.value = preset ? "" : savedMaterial;
    updateMaterialInput();
  };
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${state.session.access_token}` });
  const api = async (method = "GET", body) => {
    const response = await fetch(endpoint("admin-catalog"), { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No fue posible completar la acción");
    return payload;
  };
  const setStatus = (message, tone = "") => {
    ui.status.textContent = message;
    ui.status.classList.toggle("is-success", tone === "success");
    ui.status.classList.toggle("is-error", tone === "error");
  };
  const productStatus = (product) => !product.isActive ? "draft" : Number(product.stock) > 0 ? "stock" : "out";
  const statusLabel = (status) => ({ stock: "En stock", out: "Sin stock", draft: "Borrador" }[status]);
  const hideBusinessModules = () => {
    document.querySelectorAll(".admin-module").forEach((module) => {
      if (module !== ui.dashboard && module !== ui.editor) module.hidden = true;
    });
  };
  const activateProductsNavigation = () => {
    document.querySelectorAll("[data-admin-view]").forEach((button) => button.classList.toggle("active", button.dataset.adminView === "products"));
  };

  const showDashboard = () => {
    hideBusinessModules(); ui.editor.hidden = true; ui.dashboard.hidden = false; ui.colorsPanel.hidden = true; document.body.classList.remove("admin-is-editor");
    localStorage.setItem(lastViewKey, "products"); activateProductsNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const showEditor = () => {
    hideBusinessModules(); ui.dashboard.hidden = true; ui.colorsPanel.hidden = true; ui.editor.hidden = false; document.body.classList.add("admin-is-editor");
    localStorage.setItem(lastViewKey, "products"); activateProductsNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const componentProduct = (productId) => state.products.find((product) => product.id === productId);
  const supportsComponentsType = () => ["kit", "a_medida"].includes(selectedProductType());
  const renderComponents = () => {
    ui.components.innerHTML = state.components.length ? state.components.map((component, index) => `
      <div class="admin-component-row">
        <img class="admin-component-thumb" src="${esc(componentProduct(component.productId)?.image || "")}" alt="" loading="lazy" />
        <div class="admin-component-info"><strong>${esc(componentProduct(component.productId)?.title || "Producto no disponible")}</strong><span>${esc(componentProduct(component.productId)?.category || "Catálogo")}</span></div>
        <label class="admin-component-quantity"><span>Cantidad</span><input class="ds-input" data-component-quantity="${index}" type="number" min="1" value="${Number(component.quantity || 1)}" aria-label="Cantidad de ${esc(componentProduct(component.productId)?.title || "producto")}" /></label>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm" data-component-remove="${index}" aria-label="Eliminar producto asociado">×</button></div>`).join("") : '<p class="admin-empty-inline">Aún no hay productos incluidos.</p>';
  };
  const componentMatchesSearch = (product, search) => !search || normalizeSearch(`${product.title} ${product.category} ${product.productType}`).includes(search);
  const renderComponentPicker = () => {
    const search = normalizeSearch(ui.componentSearch.value.trim());
    const selected = new Set(state.components.map((component) => component.productId));
    const products = state.products.filter((product) => product.id !== ui.id.value && componentMatchesSearch(product, search));
    ui.componentCatalog.innerHTML = products.length ? products.map((product) => {
      const isSelected = selected.has(product.id);
      return `<button class="ds-btn ds-btn--secondary ds-btn--block admin-component-option${isSelected ? " selected" : ""}" type="button" role="option" data-component-product="${esc(product.id)}" aria-selected="${isSelected}"${isSelected ? " disabled" : ""}>
        <img src="${esc(product.image)}" alt="" loading="lazy" /><span><strong>${esc(product.title)}</strong><small>${esc(product.category || "Catálogo")}</small></span><b aria-hidden="true">${isSelected ? "✓" : "+"}</b>
      </button>`;
    }).join("") : '<p class="admin-empty-inline">No encontramos productos con esa búsqueda.</p>';
  };
  const setComponentPickerOpen = (open) => {
    const shouldOpen = Boolean(open && supportsComponentsType());
    ui.componentPicker.hidden = !shouldOpen; ui.addComponent.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) { renderComponentPicker(); requestAnimationFrame(() => ui.componentSearch.focus()); }
  };
  const updateComponentsVisibility = () => {
    const visible = supportsComponentsType();
    ui.productComponents.hidden = !visible;
    if (!visible) setComponentPickerOpen(false);
    renderComponents();
  };

  const filteredProducts = () => state.products.filter((product) => {
    const search = normalizeSearch(ui.search.value);
    const searchableText = normalizeSearch(`${product.title} ${product.category} ${product.material} ${(product.tags || []).join(" ")}`);
    if (search && !searchableText.includes(search)) return false;
    if (ui.filterCategory.value && normalizeSearch(product.category) !== normalizeSearch(ui.filterCategory.value)) return false;
    if (ui.filterOrigin.value && (ui.filterOrigin.value === "other") !== isPelgyProduct(product)) return false;
    if (ui.filterStatus.value && productStatus(product) !== ui.filterStatus.value) return false;
    const price = Number(product.price || 0); const range = ui.filterPrice.value;
    if (range === "0-20000" && price > 20000) return false;
    if (range === "20001-50000" && (price < 20001 || price > 50000)) return false;
    if (range === "50001-100000" && (price < 50001 || price > 100000)) return false;
    if (range === "100001+" && price < 100001) return false;
    return true;
  });
  const renderPagination = (total) => {
    const pages = Math.max(1, Math.ceil(total / state.perPage)); state.page = Math.min(state.page, pages);
    ui.pagination.innerHTML = Array.from({ length: pages }, (_, index) => `<button type="button" class="ds-page${state.page === index + 1 ? " is-current" : ""}" data-page="${index + 1}">${index + 1}</button>`).join("");
    ui.pagination.hidden = pages <= 1;
  };
  const renderList = () => {
    const filtered = filteredProducts(); renderPagination(filtered.length);
    const pageProducts = filtered.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    ui.count.textContent = `${filtered.length} productos`;
    ui.list.innerHTML = pageProducts.length ? pageProducts.map((product) => {
      const status = productStatus(product);
      return `<article class="admin-product-row">
        <div class="admin-product-name"><img src="${esc(product.image)}" alt="" /><div><strong>${esc(product.title)}</strong><small class="admin-product-origin${isPelgyProduct(product) ? " is-other" : ""}">${productOriginLabel(product)}</small></div></div>
        <span>${esc(product.category || "Sin categoría")}</span><span class="admin-stock admin-stock-${status}">${statusLabel(status)}<small>${Number(product.stock || 0)} u</small></span>
        <span>${esc(product.size || "No aplica")}</span><span>${Number(product.soldCount || 0)}</span><span>${money(product.price)}</span><span>${product.compareAt ? money(product.compareAt) : "—"}</span>
        <div class="admin-row-actions"><label class="ds-check admin-active-switch"><input class="ds-switch" type="checkbox" data-product-toggle="${esc(product.id)}" aria-label="${product.isActive ? "Desactivar" : "Activar"} ${esc(product.title)}" title="Activar o desactivar producto" ${product.isActive ? "checked" : ""} /><span class="ds-sr-only">Activo</span></label><button type="button" class="ds-btn ds-btn--secondary ds-btn--icon ds-btn--sm" data-edit="${esc(product.id)}" aria-label="Editar ${esc(product.title)}" title="Editar">✎</button><button class="ds-btn ds-btn--danger ds-btn--icon ds-btn--sm delete" type="button" data-delete="${esc(product.id)}" aria-label="Eliminar ${esc(product.title)}" title="Eliminar">×</button></div>
      </article>`;
    }).join("") : '<p class="admin-empty">No encontramos productos con esos filtros.</p>';
  };

  const colorRow = (color, index, scope) => {
    const isManual = scope === "manual";
    const colorImage = String(color.image || "").trim();
    return `<div class="admin-color-row${isManual ? " is-manual" : ""}" data-color-row="${index}">
      <input class="ds-input" type="color" value="${esc(color.hex || "#171D67")}" data-color-hex="${index}" aria-label="Muestra de color" />
      <input class="ds-input" type="text" value="${esc(color.name || "")}" data-color-name="${index}" placeholder="Nombre del color" />
      ${isManual ? `<label class="admin-color-image-upload" title="Subir imagen para este color"><input type="file" accept="image/*" data-color-image-file="${index}" aria-label="Subir imagen para ${esc(color.name || "este color")}" />${colorImage ? `<img src="${esc(colorImage)}" alt="" />` : '<span aria-hidden="true">+</span>'}</label>` : ""}
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm" data-color-remove="${index}" aria-label="Eliminar color">×</button>
    </div>`;
  };
  const renderColors = (scope) => {
    const global = scope === "global"; const colors = global ? state.globalColors : state.manualColors;
    const target = global ? ui.globalColorsList : ui.manualColorsList;
    target.innerHTML = colors.length ? colors.map((color, index) => colorRow(color, index, scope)).join("") : '<p class="admin-empty-inline">Aún no hay colores agregados.</p>';
  };
  const colorMode = () => document.querySelector('input[name="admin-color-mode"]:checked')?.value || "none";
  const updateColorMode = () => {
    const mode = colorMode(); const manual = mode === "manual";
    ui.manualColorsList.hidden = !manual; ui.addManualColor.hidden = !manual;
    ui.colorHelp.textContent = mode === "global" ? `Usará los ${state.globalColors.length} colores maestros globales.` : manual ? "Agrega una foto opcional por color para cambiar la imagen en el detalle del producto." : "Úsalo para productos revendidos o con color fijo.";
    if (manual) renderColors("manual");
  };
  const uploadColorImage = async (file, index) => {
    if (!file || !state.manualColors[index]) return;
    ui.imageStatus.textContent = "Subiendo imagen del color...";
    try {
      const baseId = ui.id.value || slugify(ui.title.value) || crypto.randomUUID();
      const formData = new FormData();
      formData.set("id", `${baseId}-color-${Date.now()}-${index + 1}`);
      formData.set("image", file);
      const response = await fetch(endpoint("admin-product-image"), { method: "POST", headers: { Authorization: `Bearer ${state.session.access_token}` }, body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible cargar la imagen del color");
      state.manualColors[index].image = payload.url;
      renderColors("manual");
      ui.imageStatus.textContent = "Imagen del color cargada correctamente.";
    } catch (error) { ui.imageStatus.textContent = error.message; }
  };
  const bindColorEditor = (element, scope) => {
    element.addEventListener("input", (event) => {
      const colors = scope === "global" ? state.globalColors : state.manualColors;
      if (event.target.dataset.colorName !== undefined) colors[Number(event.target.dataset.colorName)].name = event.target.value;
      if (event.target.dataset.colorHex !== undefined) colors[Number(event.target.dataset.colorHex)].hex = event.target.value.toUpperCase();
    });
    element.addEventListener("click", (event) => {
      const index = event.target.dataset.colorRemove; if (index === undefined) return;
      (scope === "global" ? state.globalColors : state.manualColors).splice(Number(index), 1); renderColors(scope);
    });
    element.addEventListener("change", (event) => {
      const index = event.target.dataset.colorImageFile;
      if (scope !== "manual" || index === undefined) return;
      uploadColorImage(event.target.files?.[0], Number(index));
    });
  };

  const setProductImages = (images) => {
    state.productImages = [...new Set((images || []).filter(Boolean))].slice(0, 3);
    ui.image.value = state.productImages[0] || "";
    ui.imageList.innerHTML = state.productImages.map((image, index) => `
      <article class="admin-image-item${index === 0 ? " is-primary" : ""}">
        <img src="${esc(image)}" alt="Imagen ${index + 1} del producto" />
        ${index === 0 ? '<span>Portada</span>' : ""}
        <div class="admin-image-item-actions">
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm" data-image-move="previous" data-image-index="${index}" aria-label="Mover imagen ${index + 1} a la izquierda" title="Mover a la izquierda" ${index === 0 ? "disabled" : ""}>←</button>
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--icon ds-btn--sm" data-image-move="next" data-image-index="${index}" aria-label="Mover imagen ${index + 1} a la derecha" title="Mover a la derecha" ${index === state.productImages.length - 1 ? "disabled" : ""}>→</button>
          <button type="button" class="ds-btn ds-btn--danger ds-btn--icon ds-btn--sm" data-image-remove="${index}" aria-label="Eliminar imagen ${index + 1}" title="Eliminar imagen">×</button>
        </div>
      </article>`).join("");
  };
  const renderCategoryFilter = () => {
    const selected = ui.filterCategory.value;
    const categories = [...new Set(state.products.map((product) => String(product.category || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    ui.filterCategory.innerHTML = `<option value="">Todas las categorías</option>${categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}`;
    ui.filterCategory.value = categories.includes(selected) ? selected : "";
  };
  const resetForm = () => {
    ui.form.reset(); ui.id.value = ""; ui.type.value = "dije"; ui.active.checked = true; ui.category.value = categoryFor(ui.type.value); ui.category.dataset.auto = "true"; state.components = []; state.manualColors = []; ui.componentSearch.value = ""; setComponentPickerOpen(false);
    setProductImages([]);
    ui.formTitle.textContent = "Nuevo producto"; ui.submit.textContent = "Guardar"; ui.imageStatus.textContent = ""; updateMaterialInput(); updateComponentsVisibility(); renderColors("manual"); updateColorMode(); setStatus("");
  };
  const fill = (product) => {
    resetForm(); ui.id.value = product.id; ui.title.value = product.title; ui.custom.checked = product.productType === "a_medida"; ui.category.value = product.category || categoryFor(product.productType); ui.type.value = selectedProductType(); ui.category.dataset.auto = "false";
    setProductImages(product.images?.length ? product.images : [product.image]);
    ui.description.value = product.description; ui.size.value = product.size || "";
    restoreMaterial(product.material); ui.stock.value = product.stock || 0; ui.price.value = product.price || 0;
    ui.compare.value = product.compareAt || ""; ui.tags.value = (product.tags || []).join(", "); ui.active.checked = product.isActive;
    state.components = product.components || []; state.manualColors = product.colors || [];
    const modeRadio = document.querySelector(`input[name="admin-color-mode"][value="${product.colorMode || "none"}"]`); if (modeRadio) modeRadio.checked = true;
    updateComponentsVisibility(); renderColors("manual"); updateColorMode(); ui.formTitle.textContent = "Editar producto"; ui.submit.textContent = "Guardar"; showEditor();
  };

  const uploadImages = async (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const remaining = 3 - state.productImages.length;
    if (!remaining) { ui.imageStatus.textContent = "Ya agregaste el máximo de 3 imágenes."; ui.imagesFile.value = ""; return; }
    if (selected.length > remaining) { ui.imageStatus.textContent = `Puedes agregar ${remaining} imagen${remaining === 1 ? "" : "es"} más.`; ui.imagesFile.value = ""; return; }
    ui.imageStatus.textContent = `Subiendo ${selected.length} imagen${selected.length === 1 ? "" : "es"}...`;
    try {
      const baseId = ui.id.value || slugify(ui.title.value) || crypto.randomUUID(); const uploaded = [];
      for (const [index, file] of selected.entries()) {
        const formData = new FormData(); formData.set("id", `${baseId}-${Date.now()}-${index + 1}`); formData.set("image", file);
        const response = await fetch(endpoint("admin-product-image"), { method: "POST", headers: { Authorization: `Bearer ${state.session.access_token}` }, body: formData });
        const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "No fue posible cargar la imagen");
        uploaded.push(payload.url);
      }
      setProductImages([...state.productImages, ...uploaded]); ui.imageStatus.textContent = "Imágenes cargadas correctamente.";
    } catch (error) { ui.imageStatus.textContent = error.message; }
    finally { ui.imagesFile.value = ""; }
  };

  const load = async () => {
    const data = await api(); state.products = data.products || []; state.globalColors = data.globalColors || [];
    renderCategoryFilter(); renderList(); renderComponents(); renderColors("global"); updateColorMode();
  };
  const denyAccess = async () => {
    await client?.auth.signOut({ scope: "local" }); sessionStorage.clear(); window.location.replace(privateDoor);
  };
  const showApp = async (session) => {
    state.session = session;
    try { await load(); ui.user.textContent = session.user.email; ui.loading.hidden = true; ui.app.hidden = false; }
    catch { await denyAccess(); }
  };
  if (!client) { ui.loading.textContent = "Falta configurar el acceso seguro."; return; }
  client.auth.getSession().then(({ data }) => data.session ? showApp(data.session) : denyAccess()).catch(denyAccess);

  ui.logout.addEventListener("click", async () => { localStorage.removeItem(lastViewKey); await client.auth.signOut({ scope: "local" }); window.location.replace("acceso-kora.html"); });
  document.querySelectorAll("[data-admin-calculator]").forEach((button) => button.addEventListener("click", () => window.location.assign("calculadora/index.html?origen=admin")));
  ui.create.addEventListener("click", () => { resetForm(); showEditor(); }); ui.cancel.addEventListener("click", showDashboard); ui.reset.addEventListener("click", resetForm);
  ui.search.addEventListener("input", () => { state.page = 1; renderList(); });
  [ui.filterCategory, ui.filterOrigin, ui.filterStatus, ui.filterPrice].forEach((control) => control.addEventListener("change", () => { state.page = 1; renderList(); }));
  ui.pagination.addEventListener("click", (event) => { if (!event.target.dataset.page) return; state.page = Number(event.target.dataset.page); renderList(); });
  ui.category.addEventListener("change", () => { ui.category.dataset.auto = "false"; ui.type.value = selectedProductType(); updateComponentsVisibility(); });
  ui.custom.addEventListener("change", () => { ui.type.value = selectedProductType(); if (ui.category.dataset.auto === "true") ui.category.value = categoryFor(ui.type.value); updateComponentsVisibility(); });
  ui.material.addEventListener("change", updateMaterialInput);
  document.querySelectorAll('input[name="admin-color-mode"]').forEach((radio) => radio.addEventListener("change", updateColorMode));
  bindColorEditor(ui.globalColorsList, "global"); bindColorEditor(ui.manualColorsList, "manual");
  ui.addGlobalColor.addEventListener("click", () => { state.globalColors.push({ name: "", hex: "#171D67" }); renderColors("global"); });
  ui.addManualColor.addEventListener("click", () => { state.manualColors.push({ name: "", hex: "#171D67" }); renderColors("manual"); });
  ui.colorsButton.addEventListener("click", () => { ui.colorsPanel.hidden = false; ui.colorsPanel.scrollIntoView({ behavior: "smooth" }); });
  ui.colorsClose.addEventListener("click", () => { ui.colorsPanel.hidden = true; });
  ui.saveGlobalColors.addEventListener("click", async () => {
    ui.globalColorsStatus.textContent = "Guardando...";
    try { const data = await api("POST", { action: "set-global-colors", colors: state.globalColors }); state.globalColors = data.globalColors || []; renderColors("global"); updateColorMode(); ui.globalColorsStatus.textContent = "Paleta global guardada."; }
    catch (error) { ui.globalColorsStatus.textContent = error.message; }
  });
  ui.addComponent.addEventListener("click", () => setComponentPickerOpen(ui.componentPicker.hidden));
  ui.closeComponentPicker.addEventListener("click", () => setComponentPickerOpen(false));
  ui.componentSearch.addEventListener("input", renderComponentPicker);
  ui.componentSearch.addEventListener("keydown", (event) => { if (event.key === "Escape") setComponentPickerOpen(false); });
  ui.componentCatalog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-component-product]"); if (!button || button.disabled) return;
    if (!state.components.some((component) => component.productId === button.dataset.componentProduct)) {
      state.components.push({ productId: button.dataset.componentProduct, quantity: 1 }); renderComponents(); renderComponentPicker();
    }
  });
  ui.components.addEventListener("change", (event) => {
    if (event.target.dataset.componentQuantity !== undefined) state.components[Number(event.target.dataset.componentQuantity)].quantity = Math.max(1, Number(event.target.value || 1));
  });
  ui.components.addEventListener("click", (event) => {
    if (event.target.dataset.componentRemove === undefined) return;
    state.components.splice(Number(event.target.dataset.componentRemove), 1); renderComponents();
    if (!ui.componentPicker.hidden) renderComponentPicker();
  });
  ui.imagesFile.addEventListener("change", () => uploadImages(ui.imagesFile.files));
  ui.imageList.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-image-remove]"); const move = event.target.closest("[data-image-move]");
    if (remove) { setProductImages(state.productImages.filter((_, index) => index !== Number(remove.dataset.imageRemove))); return; }
    if (!move) return;
    const index = Number(move.dataset.imageIndex); const target = move.dataset.imageMove === "previous" ? index - 1 : index + 1;
    if (target < 0 || target >= state.productImages.length) return;
    const images = [...state.productImages]; [images[index], images[target]] = [images[target], images[index]]; setProductImages(images);
  });

  ui.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.productImages.length) { ui.imageStatus.textContent = "Agrega al menos una imagen del producto."; ui.imagesFile.focus(); return; }
    const type = selectedProductType(); ui.type.value = type;
    const product = {
      id: ui.id.value || slugify(ui.title.value), title: ui.title.value, productType: type, category: ui.category.value.trim() || categoryFor(type), image: state.productImages[0],
      images: state.productImages, description: ui.description.value,
      size: ui.size.value, material: materialValue(), stock: Number(ui.stock.value), price: Number(ui.price.value), compareAt: Number(ui.compare.value), isActive: ui.active.checked,
      tags: ui.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
      components: ["kit", "a_medida"].includes(type) ? state.components : [], nameOptions: type === "a_medida" ? [1] : [], colorMode: colorMode(), colors: colorMode() === "manual" ? state.manualColors : []
    };
    setStatus("Guardando producto...");
    try {
      await api("POST", { action: "upsert", product });
      await load();
      resetForm();
      setStatus("Producto guardado correctamente.", "success");
    } catch (error) { setStatus(error.message, "error"); }
  });
  ui.list.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]"); const remove = event.target.closest("[data-delete]"); const toggle = event.target.closest("[data-product-toggle]");
    if (toggle) {
      const product = state.products.find((item) => item.id === toggle.dataset.productToggle); if (!product) return;
      toggle.disabled = true;
      try { await api("POST", { action: "upsert", product: { ...product, isActive: !product.isActive } }); await load(); ui.listStatus.textContent = `Producto ${product.isActive ? "desactivado" : "activado"}.`; }
      catch (error) { toggle.disabled = false; toggle.checked = product.isActive; ui.listStatus.textContent = error.message; }
      return;
    }
    if (edit) fill(state.products.find((product) => product.id === edit.dataset.edit));
    if (remove && window.confirm("¿Eliminar este producto del catálogo?")) {
      try { await api("POST", { action: "delete", id: remove.dataset.delete }); await load(); ui.listStatus.textContent = "Producto eliminado."; }
      catch (error) { ui.listStatus.textContent = error.message; }
    }
  });
})();
