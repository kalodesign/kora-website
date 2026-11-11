/* Respaldo independiente para la tienda si el script general no dibuja el catálogo.
   Siempre consulta el mismo endpoint que usa el administrador. */
(() => {
  const grid = document.querySelector("#productos");
  const count = document.querySelector("#shop-visible-count");
  const empty = document.querySelector("#shop-empty");
  const status = document.querySelector("#shop-load-status");
  const retry = document.querySelector("#shop-retry");
  const sort = document.querySelector("#shop-sort");
  if (!grid || !count || !empty || !status || !retry) return;

  let fallbackProducts = null;
  const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const hasCards = () => Boolean(grid.querySelector(".product-card"));
  const safeImage = (value) => {
    const url = String(value || "");
    return /^(?:assets\/|https:\/\/)/i.test(url) ? url : "assets/icon-06.svg";
  };
  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = String(content);
    return node;
  };
  const render = () => {
    if (!fallbackProducts) return;
    let items = [...fallbackProducts];
    if (sort?.value === "price-asc") items.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort?.value === "price-desc") items.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort?.value === "name") items.sort((a, b) => String(a.title).localeCompare(String(b.title), "es"));
    grid.replaceChildren();
    for (const product of items) {
      const card = element("article", "product-card");
      const href = "producto.html?id=" + encodeURIComponent(String(product.id));
      const media = element("a", "product-media");
      media.href = href;
      media.setAttribute("aria-label", "Ver producto " + product.title);
      const picture = element("img", "product-image-main");
      picture.src = safeImage(product.image);
      picture.alt = String(product.title || "Producto Kora");
      picture.loading = "lazy";
      picture.width = 420;
      picture.height = 420;
      picture.onerror = () => { picture.onerror = null; picture.src = "assets/icon-06.svg"; };
      media.append(picture);
      const alternate = (Array.isArray(product.images) ? product.images : []).find(url => url && url !== product.image);
      if (alternate) {
        const hover = element("img", "product-image-hover");
        hover.src = safeImage(alternate);
        hover.alt = "";
        hover.loading = "lazy";
        hover.width = 420;
        hover.height = 420;
        hover.setAttribute("aria-hidden", "true");
        hover.onerror = () => { hover.remove(); };
        media.append(hover);
      }
      const info = element("div", "product-info");
      const link = element("a", "product-info-link");
      link.href = href;
      const heading = element("div", "product-heading-row");
      heading.append(element("h3", "", product.title), element("span", "", product.size || product.category || ""));
      const price = element("div", "product-price");
      price.append(element("strong", "", money.format(Number(product.price) || 0)));
      link.append(heading, price);
      const cta = element("a", "product-add-button", "Ver producto");
      cta.href = href;
      info.append(link, cta);
      card.append(media, info);
      grid.append(card);
    }
    count.textContent = String(items.length);
    empty.hidden = items.length > 0;
    status.hidden = true;
    retry.hidden = true;
  };
  const load = async () => {
    if (hasCards()) { status.hidden = true; retry.hidden = true; return; }
    retry.hidden = true;
    empty.hidden = true;
    status.textContent = "Cargando productos de la tienda…";
    status.hidden = false;
    try {
      const url = window.koraEndpoint?.("catalog", "");
      if (!url) throw new Error("El catálogo todavía no está configurado.");
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("El catálogo no respondió (" + response.status + ").");
      const data = await response.json();
      if (!Array.isArray(data.products)) throw new Error("El catálogo devolvió datos incompletos.");
      if (hasCards()) { status.hidden = true; return; }
      fallbackProducts = data.products;
      render();
    } catch (error) {
      if (hasCards()) { status.hidden = true; return; }
      status.textContent = "No pudimos cargar los productos. Revisa tu conexión e inténtalo de nuevo.";
      retry.hidden = false;
      console.warn("No se pudo cargar el catálogo de la tienda:", error);
    }
  };
  retry.addEventListener("click", load);
  sort?.addEventListener("change", () => { if (fallbackProducts) render(); }, true);
  window.setTimeout(load, 800);
})();
