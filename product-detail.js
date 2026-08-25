(() => {
  const root = document.querySelector("#product-detail-root");
  if (!root) return;

  const money = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const elements = {
    image: document.querySelector("#product-detail-image"),
    category: document.querySelector("#product-detail-category"),
    title: document.querySelector("#product-detail-title"),
    price: document.querySelector("#product-detail-price"),
    compare: document.querySelector("#product-detail-compare"),
    description: document.querySelector("#product-detail-description"),
    specs: document.querySelector("#product-detail-specs"),
    breadcrumbCategory: document.querySelector("#product-breadcrumb-category"),
    breadcrumbTitle: document.querySelector("#product-breadcrumb-title"),
    quantity: document.querySelector("#product-quantity-value"),
    minus: document.querySelector("#product-quantity-minus"),
    plus: document.querySelector("#product-quantity-plus"),
    add: document.querySelector("#product-detail-add"),
    favorite: document.querySelector("#product-favorite"),
    components: document.querySelector("#product-components"),
    componentsGrid: document.querySelector("#product-components-grid"),
    relatedGrid: document.querySelector("#product-related-grid"),
    relatedCount: document.querySelector("#product-related-count")
  };

  let products = [];
  let product = null;
  let quantity = 1;

  const getProductId = () => new URLSearchParams(window.location.search).get("id") || "llavero-coqueta-rosada";

  const loadProducts = async () => {
    try {
      const response = await fetch("data/products.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el catálogo");
      return await response.json();
    } catch {
      return window.KORA_PRODUCTS || [];
    }
  };

  const productCard = (item) => {
    const variant = item.category === "A medida" ? "A medida" : item.size || item.category;
    const compare = item.compareAt ? `<span>${money.format(item.compareAt)}</span>` : "";
    return `
      <article class="product-card">
        <a class="product-media" href="producto.html?id=${encodeURIComponent(item.id)}" aria-label="Ver producto ${escapeHtml(item.title)}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
        </a>
        <div class="product-info">
          <div class="product-heading-row">
            <h3>${escapeHtml(item.title)}</h3>
            <span>${escapeHtml(variant)}</span>
          </div>
          <div class="product-price">
            <strong>${money.format(item.price)}</strong>
            ${compare}
          </div>
          <button class="product-add-button" type="button" data-related-add="${escapeHtml(item.id)}">
            <img src="assets/llaveros-cart.svg" alt="" />
            <span>Agregar al carrito</span>
          </button>
        </div>
      </article>
    `;
  };

  const renderComponents = () => {
    const componentRows = (product.components || [])
      .map((component) => {
        const item = products.find((candidate) => candidate.id === component.productId);
        return item ? { ...item, quantity: component.quantity || 1 } : null;
      })
      .filter(Boolean);

    if (product.category !== "A medida" || componentRows.length === 0) {
      elements.components.hidden = true;
      return;
    }

    elements.components.hidden = false;
    elements.componentsGrid.innerHTML = componentRows
      .map(
        (item) => `
          <a class="product-component-card" href="producto.html?id=${encodeURIComponent(item.id)}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.size)} · Cantidad ${item.quantity}</small>
            </span>
          </a>
        `
      )
      .join("");
  };

  const renderRelated = () => {
    const related = products
      .filter((item) => item.id !== product.id)
      .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
      .slice(0, 4);
    elements.relatedCount.textContent = `${related.length} productos relacionados`;
    elements.relatedGrid.innerHTML = related.map(productCard).join("");
  };

  const render = () => {
    const isPersonalized = product.category === "A medida";
    document.title = `${product.title} | Kora Studio`;
    document.body.classList.toggle("is-personalized-product", isPersonalized);
    elements.image.src = product.image;
    elements.image.alt = product.title;
    elements.category.textContent = product.category;
    elements.title.textContent = product.title;
    elements.price.textContent = money.format(product.price);
    elements.compare.textContent = product.compareAt ? money.format(product.compareAt) : "";
    elements.compare.hidden = !product.compareAt;
    elements.description.textContent = product.description;
    elements.breadcrumbCategory.textContent = isPersonalized ? "Llaveros" : product.category;
    elements.breadcrumbCategory.href = `hazlotumismo.html?categoria=${encodeURIComponent(product.category)}`;
    elements.breadcrumbTitle.textContent = product.title;
    elements.specs.innerHTML = `
      <div><dt>Medida</dt><dd>${escapeHtml(product.size || "No aplica")}</dd></div>
      <div><dt>Disponibilidad</dt><dd>${Number(product.stock || 0)} unidades</dd></div>
      <div><dt>Tipo</dt><dd>${escapeHtml(product.category)}</dd></div>
    `;
    renderComponents();
    renderRelated();
  };

  const setQuantity = (nextQuantity) => {
    quantity = Math.min(Math.max(1, nextQuantity), Math.max(1, Number(product?.stock || 1)));
    elements.quantity.textContent = String(quantity);
    elements.minus.disabled = quantity <= 1;
    elements.plus.disabled = quantity >= Number(product?.stock || 1);
  };

  elements.minus.addEventListener("click", () => setQuantity(quantity - 1));
  elements.plus.addEventListener("click", () => setQuantity(quantity + 1));

  elements.add.addEventListener("click", () => {
    if (!product) return;
    window.KoraCart?.add(product.id, quantity, product);
    const label = elements.add.querySelector("span");
    const original = label.textContent;
    label.textContent = "Agregado al carrito";
    window.setTimeout(() => {
      label.textContent = original;
    }, 1200);
  });

  elements.favorite.addEventListener("click", () => {
    const isFavorite = elements.favorite.getAttribute("aria-pressed") === "true";
    elements.favorite.setAttribute("aria-pressed", String(!isFavorite));
    elements.favorite.setAttribute("aria-label", isFavorite ? "Agregar a favoritos" : "Quitar de favoritos");
    elements.favorite.querySelector("span").textContent = isFavorite ? "♡" : "♥";
  });

  elements.relatedGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-related-add]");
    if (!button) return;
    const relatedProduct = products.find((item) => item.id === button.dataset.relatedAdd);
    window.KoraCart?.add(button.dataset.relatedAdd, 1, relatedProduct);
    const label = button.querySelector("span");
    label.textContent = "Agregado";
    window.setTimeout(() => {
      label.textContent = "Agregar al carrito";
    }, 1000);
  });

  loadProducts().then((items) => {
    products = items;
    product = products.find((item) => item.id === getProductId()) || products.find((item) => item.id === "llavero-coqueta-rosada") || products[0];
    if (!product) {
      root.innerHTML = '<section class="section-inner product-not-found"><h1>Producto no disponible</h1><a class="button button-primary" href="hazlotumismo.html">Ir a tienda</a></section>';
      return;
    }
    setQuantity(1);
    render();
  });
})();
