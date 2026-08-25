const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const cartCount = document.querySelector(".cart-count");

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const formatMoney = (value) => money.format(Number(value || 0));

const store = {
  products: [],
  filteredProducts: [],
  activeCategory: "Todos",
  cart: JSON.parse(localStorage.getItem("kora_cart") || "[]")
};

const ensureCartDrawer = () => {
  if (!document.querySelector(".cart-button") || document.querySelector("#cart-drawer")) return;

  const overlay = document.createElement("div");
  overlay.className = "cart-overlay";
  overlay.id = "cart-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("aside");
  drawer.className = "cart-drawer";
  drawer.id = "cart-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-labelledby", "cart-title");
  drawer.innerHTML = `
    <div class="cart-head">
      <h2 id="cart-title">Carrito</h2>
      <button type="button" class="modal-close" data-close-cart aria-label="Cerrar carrito">×</button>
    </div>
    <div class="cart-items" id="cart-items"></div>
    <p class="cart-empty" id="cart-empty">Tu carrito está vacío.</p>
    <div class="cart-footer">
      <div class="cart-total">
        <span>Total</span>
        <strong id="cart-total">$0</strong>
      </div>
      <button class="button button-primary" type="button" data-checkout-open>Finalizar pedido</button>
    </div>
  `;

  document.body.append(overlay, drawer);
};

ensureCartDrawer();

const ensureCheckoutModal = () => {
  if (!document.querySelector(".cart-button") || document.querySelector("#checkout-modal")) return;

  const modal = document.createElement("div");
  modal.className = "checkout-modal-overlay";
  modal.id = "checkout-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <article class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <button class="modal-close" type="button" data-close-checkout aria-label="Cerrar checkout">×</button>
      <form class="checkout-form" id="checkout-form" novalidate>
        <header>
          <p>Checkout seguro</p>
          <h2 id="checkout-title">Finaliza tu pedido</h2>
          <span>Completa tus datos y te llevamos a Wompi para pagar de forma segura.</span>
        </header>
        <div class="checkout-form-grid">
          <label>
            <span>Nombre completo *</span>
            <input name="name" type="text" autocomplete="name" required />
          </label>
          <label>
            <span>Correo electrónico *</span>
            <input name="email" type="email" autocomplete="email" required />
          </label>
          <label>
            <span>Celular *</span>
            <input name="phone" type="tel" autocomplete="tel" required />
          </label>
          <label>
            <span>Ciudad *</span>
            <input name="city" type="text" autocomplete="address-level2" required />
          </label>
          <label>
            <span>Departamento</span>
            <input name="region" type="text" autocomplete="address-level1" />
          </label>
          <label>
            <span>Dirección de entrega *</span>
            <input name="address" type="text" autocomplete="street-address" required />
          </label>
          <label class="checkout-full">
            <span>Notas del pedido</span>
            <textarea name="notes" rows="3" placeholder="Detalles de entrega o personalización"></textarea>
          </label>
        </div>
        <div class="checkout-summary">
          <span>Total a pagar</span>
          <strong id="checkout-total">$0</strong>
        </div>
        <button class="button button-primary checkout-submit" type="submit">Pagar con Wompi</button>
        <p class="checkout-status" id="checkout-status" aria-live="polite"></p>
      </form>
    </article>
  `;

  document.body.append(modal);
};

ensureCheckoutModal();

const selectors = {
  productGrid: document.querySelector("#productos"),
  filterWrap: document.querySelector("#shop-filters"),
  search: document.querySelector("#shop-search"),
  sort: document.querySelector("#shop-sort"),
  visibleCount: document.querySelector("#shop-visible-count"),
  empty: document.querySelector("#shop-empty"),
  cartButton: document.querySelector(".cart-button"),
  cartDrawer: document.querySelector("#cart-drawer"),
  cartOverlay: document.querySelector("#cart-overlay"),
  cartItems: document.querySelector("#cart-items"),
  cartEmpty: document.querySelector("#cart-empty"),
  cartTotal: document.querySelector("#cart-total"),
  checkoutModal: document.querySelector("#checkout-modal"),
  checkoutForm: document.querySelector("#checkout-form"),
  checkoutTotal: document.querySelector("#checkout-total"),
  checkoutStatus: document.querySelector("#checkout-status"),
  productModal: document.querySelector("#product-modal"),
  productModalImage: document.querySelector("#product-modal-image"),
  productModalCategory: document.querySelector("#product-modal-category"),
  productModalTitle: document.querySelector("#product-modal-title"),
  productModalDescription: document.querySelector("#product-modal-description"),
  productModalSize: document.querySelector("#product-modal-size"),
  productModalPrice: document.querySelector("#product-modal-price"),
  productModalCompare: document.querySelector("#product-modal-compare"),
  productModalQty: document.querySelector("#product-modal-qty"),
  productModalAdd: document.querySelector("#product-modal-add")
};

let selectedProductId = null;
const productSource = selectors.productGrid?.dataset.productsSrc || "data/products.json";
const productFallbackKey = selectors.productGrid?.dataset.productsFallback || "KORA_PRODUCTS";
const initialCategory = new URLSearchParams(window.location.search).get("categoria");

const saveCart = () => {
  localStorage.setItem("kora_cart", JSON.stringify(store.cart));
};

const getCartQuantity = () => store.cart.reduce((total, item) => total + item.qty, 0);

const updateCartCount = () => {
  if (cartCount) cartCount.textContent = String(getCartQuantity());
};

const getProduct = (id) =>
  store.products.find((product) => product.id === id) ||
  store.cart.find((item) => item.id === id)?.product;

const addToCart = (productId, qty = 1, fallbackProduct = null) => {
  const product = getProduct(productId) || fallbackProduct;
  if (!product) return;
  const nextQty = Math.max(1, Number(qty) || 1);
  const existing = store.cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += nextQty;
  } else {
    store.cart.push({
      id: productId,
      qty: nextQty,
      product: {
        id: product.id,
        title: product.title,
        category: product.category,
        image: product.image,
        description: product.description,
        size: product.size,
        price: product.price,
        compareAt: product.compareAt
      }
    });
  }
  saveCart();
  renderCart();
};

const removeFromCart = (productId) => {
  store.cart = store.cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
};

const updateCartItem = (productId, qty) => {
  const item = store.cart.find((cartItem) => cartItem.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart();
  renderCart();
};

const renderFilters = () => {
  if (!selectors.filterWrap) return;
  const categories = ["Todos", ...new Set(store.products.map((product) => product.category).filter(Boolean))];
  selectors.filterWrap.innerHTML = categories
    .map((category) => {
      const active = category === store.activeCategory ? " active" : "";
      return `<button class="filter-chip${active}" type="button" data-filter="${category}">${category}</button>`;
    })
    .join("");
};

const getFilteredProducts = () => {
  const term = selectors.search?.value.trim().toLowerCase() || "";
  let products = [...store.products];
  if (store.activeCategory !== "Todos") {
    products = products.filter((product) => product.category === store.activeCategory);
  }
  if (term) {
    products = products.filter((product) => {
      const text = `${product.title} ${product.category} ${product.description}`.toLowerCase();
      return text.includes(term);
    });
  }
  const sortValue = selectors.sort?.value || "featured";
  if (sortValue === "price-asc") products.sort((a, b) => a.price - b.price);
  if (sortValue === "price-desc") products.sort((a, b) => b.price - a.price);
  if (sortValue === "name") products.sort((a, b) => a.title.localeCompare(b.title));
  return products;
};

const renderProducts = () => {
  if (!selectors.productGrid) return;
  store.filteredProducts = getFilteredProducts();
  selectors.visibleCount.textContent = String(store.filteredProducts.length);
  selectors.empty.hidden = store.filteredProducts.length > 0;
  selectors.productGrid.innerHTML = store.filteredProducts
    .map((product) => {
      const compare = product.compareAt ? `<span>${formatMoney(product.compareAt)}</span>` : "";
      const variant = product.category === "A medida" ? "A medida" : product.size || product.category || "";
      return `
        <article class="product-card">
          <a class="product-media" href="producto.html?id=${encodeURIComponent(product.id)}" aria-label="Ver producto ${product.title}">
            <img src="${product.image}" alt="${product.title}" />
          </a>
          <div class="product-info">
            <div class="product-heading-row">
              <h3>${product.title}</h3>
              <span>${variant}</span>
            </div>
            <div class="product-price">
              <strong>${formatMoney(product.price)}</strong>
              ${compare}
            </div>
            <button class="product-add-button" type="button" data-add="${product.id}">
              <img src="assets/llaveros-cart.svg" alt="" />
              <span>Agregar al carrito</span>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
};

const openProductModal = (productId) => {
  const product = getProduct(productId);
  if (!product || !selectors.productModal) return;
  selectedProductId = productId;
  selectors.productModalImage.src = product.image;
  selectors.productModalImage.alt = product.title;
  selectors.productModalCategory.textContent = product.category;
  selectors.productModalTitle.textContent = product.title;
  selectors.productModalDescription.textContent = product.description;
  selectors.productModalSize.textContent = product.size ? `Medida: ${product.size}` : "";
  selectors.productModalPrice.textContent = formatMoney(product.price);
  selectors.productModalCompare.textContent = product.compareAt ? formatMoney(product.compareAt) : "";
  selectors.productModalQty.value = "1";
  selectors.productModal.classList.add("is-open");
  selectors.productModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeProductModal = () => {
  if (!selectors.productModal) return;
  selectors.productModal.classList.remove("is-open");
  selectors.productModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const openCart = () => {
  if (!selectors.cartDrawer || !selectors.cartOverlay) return;
  selectors.cartDrawer.classList.add("is-open");
  selectors.cartOverlay.classList.add("is-open");
  selectors.cartDrawer.setAttribute("aria-hidden", "false");
  selectors.cartOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeCart = () => {
  if (!selectors.cartDrawer || !selectors.cartOverlay) return;
  selectors.cartDrawer.classList.remove("is-open");
  selectors.cartOverlay.classList.remove("is-open");
  selectors.cartDrawer.setAttribute("aria-hidden", "true");
  selectors.cartOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const getCartTotal = () =>
  store.cart.reduce((sum, item) => {
    const product = getProduct(item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);

const openCheckout = () => {
  if (!selectors.checkoutModal || !selectors.checkoutForm) return;
  if (!store.cart.length) {
    openCart();
    selectors.cartEmpty.textContent = "Agrega al menos un producto para finalizar tu pedido.";
    return;
  }
  selectors.checkoutStatus.textContent = "";
  selectors.checkoutTotal.textContent = formatMoney(getCartTotal());
  selectors.checkoutModal.classList.add("is-open");
  selectors.checkoutModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  selectors.checkoutForm.querySelector("input, select, textarea")?.focus();
};

const closeCheckout = () => {
  if (!selectors.checkoutModal) return;
  selectors.checkoutModal.classList.remove("is-open");
  selectors.checkoutModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

window.KoraCart = {
  add: addToCart,
  open: openCart
};

const renderCart = () => {
  updateCartCount();
  if (!selectors.cartItems) return;
  const rows = store.cart
    .map((item) => {
      const product = getProduct(item.id);
      if (!product) return "";
      return `
        <article class="cart-item">
          <img src="${product.image}" alt="${product.title}" />
          <div>
            <h3>${product.title}</h3>
            <p>${formatMoney(product.price)} · ${product.size || product.category}</p>
            <div class="cart-item-controls">
              <button type="button" data-cart-dec="${item.id}" aria-label="Restar">-</button>
              <strong>${item.qty}</strong>
              <button type="button" data-cart-inc="${item.id}" aria-label="Sumar">+</button>
              <button class="cart-remove" type="button" data-cart-remove="${item.id}">Eliminar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  selectors.cartItems.innerHTML = rows;
  const total = store.cart.reduce((sum, item) => {
    const product = getProduct(item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  selectors.cartTotal.textContent = formatMoney(total);
  if (selectors.checkoutTotal) selectors.checkoutTotal.textContent = formatMoney(total);
  selectors.cartEmpty.classList.toggle("is-visible", store.cart.length === 0);
};

const loadProducts = async () => {
  try {
    const response = await fetch(productSource, { cache: "no-store" });
    if (!response.ok) throw new Error("No products JSON");
    store.products = await response.json();
  } catch {
    store.products = window[productFallbackKey] || window.KORA_PRODUCTS || [];
  }
  if (selectors.productGrid && initialCategory && store.products.some((product) => product.category === initialCategory)) {
    store.activeCategory = initialCategory;
  }
  if (selectors.productGrid) {
    renderFilters();
    renderProducts();
  }
  renderCart();
};

selectors.filterWrap?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  store.activeCategory = button.dataset.filter;
  renderFilters();
  renderProducts();
});

selectors.search?.addEventListener("input", renderProducts);
selectors.sort?.addEventListener("change", renderProducts);

selectors.productGrid?.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) addToCart(addButton.dataset.add);
});

selectors.productModalAdd?.addEventListener("click", () => {
  if (!selectedProductId) return;
  addToCart(selectedProductId, selectors.productModalQty.value);
  closeProductModal();
});

document.querySelectorAll("[data-close-product-modal]").forEach((button) => {
  button.addEventListener("click", closeProductModal);
});

selectors.productModal?.addEventListener("click", (event) => {
  if (event.target === selectors.productModal) closeProductModal();
});

selectors.cartButton?.addEventListener("click", openCart);
selectors.cartOverlay?.addEventListener("click", closeCart);
selectors.checkoutModal?.addEventListener("click", (event) => {
  if (event.target === selectors.checkoutModal) closeCheckout();
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-checkout-open]")) {
    closeCart();
    openCheckout();
  }
  if (event.target.closest("[data-close-checkout]")) closeCheckout();
});

selectors.checkoutForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectors.checkoutForm.reportValidity()) return;

  const submitButton = selectors.checkoutForm.querySelector("button[type='submit']");
  const formData = new FormData(selectors.checkoutForm);
  const payload = {
    items: store.cart.map((item) => ({ id: item.id, qty: item.qty })),
    customer: Object.fromEntries(formData.entries())
  };

  submitButton.disabled = true;
  submitButton.textContent = "Creando checkout";
  selectors.checkoutStatus.className = "checkout-status";
  selectors.checkoutStatus.textContent = "";

  try {
    const response = await fetch("/api/checkout/wompi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const checkout = await response.json();
    if (!response.ok) throw new Error(checkout.error || "No se pudo crear el pago");

    const params = new URLSearchParams({
      "public-key": checkout.publicKey,
      currency: checkout.currency,
      "amount-in-cents": String(checkout.amountInCents),
      reference: checkout.reference,
      "signature:integrity": checkout.integrity,
      "redirect-url": checkout.redirectUrl
    });
    window.location.href = `${checkout.checkoutUrl}?${params.toString()}`;
  } catch (error) {
    selectors.checkoutStatus.className = "checkout-status is-error";
    selectors.checkoutStatus.textContent = error.message || "No pudimos abrir Wompi. Escríbenos para finalizar tu pedido.";
    submitButton.disabled = false;
    submitButton.textContent = "Pagar con Wompi";
  }
});

document.querySelectorAll("[data-close-cart]").forEach((button) => {
  button.addEventListener("click", closeCart);
});

selectors.cartItems?.addEventListener("click", (event) => {
  const inc = event.target.closest("[data-cart-inc]");
  const dec = event.target.closest("[data-cart-dec]");
  const remove = event.target.closest("[data-cart-remove]");
  if (inc) {
    const item = store.cart.find((cartItem) => cartItem.id === inc.dataset.cartInc);
    updateCartItem(inc.dataset.cartInc, (item?.qty || 0) + 1);
  }
  if (dec) {
    const item = store.cart.find((cartItem) => cartItem.id === dec.dataset.cartDec);
    if (item && item.qty <= 1) removeFromCart(dec.dataset.cartDec);
    else updateCartItem(dec.dataset.cartDec, (item?.qty || 1) - 1);
  }
  if (remove) removeFromCart(remove.dataset.cartRemove);
});

const petModal = document.querySelector("#pet-modal");
const petModalOpenButtons = document.querySelectorAll("[data-open-pet-modal]");
const petModalCloseButtons = document.querySelectorAll("[data-close-pet-modal]");
const petModalForm = document.querySelector(".pet-modal-form");
let petModalLastFocus = null;

const openPetModal = () => {
  if (!petModal) return;
  petModalLastFocus = document.activeElement;
  petModal.classList.add("is-open");
  petModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  petModal.querySelector(".pet-modal-form input, .pet-modal-form select, .pet-modal-form textarea")?.focus();
};

const closePetModal = () => {
  if (!petModal) return;
  petModal.classList.remove("is-open");
  petModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  petModalLastFocus?.focus?.();
};

petModalOpenButtons.forEach((button) => {
  button.addEventListener("click", openPetModal);
});

petModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closePetModal);
});

petModal?.addEventListener("click", (event) => {
  if (event.target === petModal) closePetModal();
});

petModalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const submitButton = petModalForm.querySelector("button[type='submit']");
  if (!submitButton) return;
  if (!petModalForm.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.textContent = "Enviando solicitud";
  fetch("/api/pet-request", {
    method: "POST",
    body: new FormData(petModalForm)
  })
    .then((response) => {
      if (!response.ok) throw new Error("No se pudo enviar");
      submitButton.textContent = "Solicitud enviada";
      petModalForm.reset();
      window.setTimeout(closePetModal, 900);
      window.setTimeout(() => {
        submitButton.textContent = "Enviar solicitud";
        submitButton.disabled = false;
      }, 1400);
    })
    .catch(() => {
      submitButton.textContent = "Intenta de nuevo";
      window.setTimeout(() => {
        submitButton.textContent = "Enviar solicitud";
        submitButton.disabled = false;
      }, 1600);
    });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProductModal();
    closeCart();
    closeCheckout();
    closePetModal();
  }
});

loadProducts();
