(() => {
  const track = document.querySelector("#best-sellers-track");
  if (!track) return;

  const productIds = [
    "llavero-coqueta-rosada", "llavero-mantente-salvaje",
    "llavero-playa-azul", "llavero-nombre-rosa",
    "llavero-corazon-rojo", "llavero-color-pop",
    "set-inicial", "dije-corazon-rojo",
    "dije-hongo-rojo", "dije-redondo-gratitud"
  ];
  const views = {
    "llavero-coqueta-rosada": ["assets/llaveros-image-03-desktop.jpg", "assets/llaveros-image-05.png"],
    "llavero-mantente-salvaje": ["assets/llaveros-image-05.png", "assets/llaveros-image-07.png"],
    "llavero-playa-azul": ["assets/llaveros-image-04.png", "assets/llaveros-image-06.png"],
    "llavero-nombre-rosa": ["assets/llaveros-image-02.png", "assets/image-13.png"],
    "llavero-corazon-rojo": ["assets/llaveros-image-07.png", "assets/llaveros-image-05.png"],
    "llavero-color-pop": ["assets/llaveros-image-02.png", "assets/image-13.png"],
    "set-inicial": ["assets/image-13.png", "assets/image-13.png"],
    "dije-corazon-rojo": ["assets/image-12.png", "assets/image-12.png"],
    "dije-hongo-rojo": ["assets/image-08.png", "assets/image-08.png"],
    "dije-redondo-gratitud": ["assets/image-09.png", "assets/image-09.png"]
  };
  const palette = [
    { name: "Original", hex: "#e74e70", filter: "none" },
    { name: "Celeste", hex: "#72cbe1", filter: "hue-rotate(175deg) saturate(1.12)" },
    { name: "Lila", hex: "#a685d5", filter: "hue-rotate(255deg) saturate(1.1)" },
    { name: "Verde", hex: "#a7c87d", filter: "hue-rotate(100deg) saturate(1.1)" }
  ];
  const money = value => new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0
  }).format(value);
  const products = window.KORA_PRODUCTS || [];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  track.innerHTML = productIds.map(id => {
    const product = products.find(item => item.id === id);
    if (!product) return "";
    const galleryImages = [...new Set((Array.isArray(product.images) ? product.images : []).filter(Boolean))];
    const [fallbackFront, fallbackBack] = views[id] || [];
    const front = product.image || galleryImages[0] || fallbackFront;
    const back = galleryImages.find(image => image !== front) || (fallbackBack !== front ? fallbackBack : "");
    return `<article class="best-card" data-product-id="${escape(id)}" style="--variant-filter:none">
      <div class="best-card-media">
        <a class="best-card-link" href="producto.html?id=${encodeURIComponent(id)}" aria-label="Ver ${escape(product.title)}">
          <img class="best-card-primary" src="${front}" alt="${escape(product.title)}" loading="lazy" width="329" height="362">
          ${back ? `<img class="best-card-secondary" src="${escape(back)}" alt="" loading="lazy" width="329" height="362" aria-hidden="true">` : ""}
        </a>
        <button class="best-card-quick" type="button" data-quick-buy="${escape(id)}" aria-label="Compra rápida: ${escape(product.title)}">COMPRA RÁPIDA</button>
      </div>
      <div class="best-card-info">
        <a href="producto.html?id=${encodeURIComponent(id)}" class="best-card-title">${escape(product.title)}</a>
        <span class="best-card-divider" aria-hidden="true"></span>
        <span class="best-card-price">${money(product.price)}</span>
      </div>
      <div class="best-card-swatches" role="group" aria-label="Vistas de color para ${escape(product.title)}">
        ${palette.map((color, index) => `<button type="button" class="best-card-swatch${index === 0 ? " is-selected" : ""}" data-color-index="${index}" style="--swatch:${color.hex}" aria-label="Ver color ${color.name}" aria-pressed="${index === 0}" title="${color.name}"></button>`).join("")}
      </div>
    </article>`;
  }).join("");

  track.addEventListener("click", event => {
    const swatch = event.target.closest("[data-color-index]");
    if (swatch) {
      const card = swatch.closest(".best-card");
      const index = Number(swatch.dataset.colorIndex);
      card.style.setProperty("--variant-filter", palette[index].filter);
      card.querySelectorAll(".best-card-swatch").forEach(button => {
        const selected = button === swatch;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      return;
    }
    const quick = event.target.closest("[data-quick-buy]");
    if (quick) {
      const product = products.find(item => item.id === quick.dataset.quickBuy);
      if (!product) return;
      window.KoraCart?.add(product.id, 1, product);
      window.KoraCart?.open();
    }
  });

  const previous = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");
  const updateArrows = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  const move = direction => {
    const card = track.querySelector(".best-card");
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();
})();