(() => {
  const list = document.querySelector("#cart-page-items");
  const count = document.querySelector("#cart-page-count");
  const subtotal = document.querySelector("#cart-page-subtotal");
  const checkout = document.querySelector("#cart-page-checkout");
  if (!list || !count || !subtotal || !checkout) return;
  const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const node = (tag, className, value) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (value !== undefined) result.textContent = String(value);
    return result;
  };
  const render = () => {
    const items = window.KoraCart?.snapshot?.() || [];
    list.replaceChildren();
    count.textContent = items.length ? "(" + items.reduce((sum, item) => sum + Number(item.qty || 0), 0) + ")" : "";
    checkout.disabled = !items.length;
    subtotal.textContent = money.format(items.reduce((sum, item) =>
      sum + Number(item.product?.price || 0) * Number(item.qty || 0), 0));
    if (!items.length) {
      const empty = node("div", "cart-page-empty");
      empty.append(node("h3", "", "Tu carrito está vacío"), node("p", "", "Explora la tienda para encontrar tu próxima pieza."));
      const link = node("a", "ds-btn ds-btn--primary", "Ir a Tienda");
      link.href = "hazlotumismo.html";
      empty.append(link);
      list.append(empty);
      return;
    }
    for (const item of items) {
      const product = item.product || {};
      const card = node("article", "cart-page-product");
      const href = "producto.html?id=" + encodeURIComponent(String(item.id));
      const imageLink = node("a");
      imageLink.href = href;
      imageLink.setAttribute("aria-label", "Ver " + (product.title || "producto"));
      const img = node("img");
      const src = String(product.image || "");
      img.src = /^(?:assets\/|https:\/\/)/i.test(src) ? src : "assets/icon-06.svg";
      img.alt = product.title || "Producto Kora";
      img.loading = "lazy";
      img.width = 96;
      img.height = 96;
      img.onerror = () => { img.onerror = null; img.src = "assets/icon-06.svg"; };
      imageLink.append(img);
      const details = node("div", "cart-page-product-details");
      const heading = node("h3");
      const titleLink = node("a", "", product.title || "Producto");
      titleLink.href = href;
      heading.append(titleLink);
      details.append(heading, node("p", "", product.category || ""));
      if (item.customNames?.length) details.append(node("p", "", "Nombres: " + item.customNames.join(", ")));
      const controls = node("div", "cart-page-controls");
      const stepper = node("div", "cart-page-stepper");
      const personalized = Boolean(item.customNames?.length);
      const current = Number(item.qty || 1);
      const max = Number(product.maxQuantity || product.stock || Infinity);
      const minus = node("button", "", "−");
      minus.type = "button";
      minus.dataset.cartPageDec = String(item.id);
      minus.setAttribute("aria-label", "Restar una unidad de " + (product.title || "producto"));
      minus.disabled = personalized || current <= 1;
      const plus = node("button", "", "+");
      plus.type = "button";
      plus.dataset.cartPageInc = String(item.id);
      plus.setAttribute("aria-label", "Añadir una unidad de " + (product.title || "producto"));
      plus.disabled = personalized || current >= max;
      stepper.append(minus, node("strong", "", current), plus);
      controls.append(stepper);
      const remove = node("button", "cart-page-remove", "Eliminar");
      remove.type = "button";
      remove.dataset.cartPageRemove = String(item.id);
      controls.append(remove);
      details.append(controls);
      if (personalized) details.append(node("p", "", "Para cambiar los nombres, elimina el producto y agrégalo de nuevo."));
      card.append(imageLink, details, node("strong", "cart-page-product-price", money.format(Number(product.price || 0) * current)));
      list.append(card);
    }
  };
  list.addEventListener("click", event => {
    const button = event.target.closest("button[data-cart-page-dec], button[data-cart-page-inc], button[data-cart-page-remove]");
    if (!button || button.disabled || !window.KoraCart) return;
    const id = button.dataset.cartPageDec || button.dataset.cartPageInc || button.dataset.cartPageRemove;
    const current = window.KoraCart.snapshot().find(item => item.id === id);
    if (!current) return;
    if (button.hasAttribute("data-cart-page-remove")) window.KoraCart.remove(id);
    else window.KoraCart.setQuantity(id, Number(current.qty) + (button.hasAttribute("data-cart-page-inc") ? 1 : -1));
  });
  document.addEventListener("kora:cart-updated", render);
  render();
})();
