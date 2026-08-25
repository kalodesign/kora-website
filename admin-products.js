const adminState = {
  products: []
};

const admin = {
  form: document.querySelector("#product-admin-form"),
  id: document.querySelector("#admin-product-id"),
  title: document.querySelector("#admin-title"),
  category: document.querySelector("#admin-category"),
  image: document.querySelector("#admin-image"),
  imageFile: document.querySelector("#admin-image-file"),
  description: document.querySelector("#admin-description"),
  size: document.querySelector("#admin-size"),
  stock: document.querySelector("#admin-stock"),
  price: document.querySelector("#admin-price"),
  compare: document.querySelector("#admin-compare"),
  list: document.querySelector("#admin-products-list"),
  status: document.querySelector("#admin-status"),
  reset: document.querySelector("#admin-reset"),
  export: document.querySelector("#admin-export")
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const setStatus = (message) => {
  admin.status.textContent = message;
};

const loadAdminProducts = async () => {
  try {
    const response = await fetch("api/products", { cache: "no-store" });
    if (!response.ok) throw new Error("API no disponible");
    adminState.products = await response.json();
    setStatus("Conectado al backend local.");
  } catch {
    adminState.products = JSON.parse(localStorage.getItem("kora_admin_products") || "null") || window.KORA_PRODUCTS || [];
    setStatus("Modo local: exporta el JSON para actualizar el sitio sin servidor.");
  }
  renderAdminProducts();
};

const saveAdminProducts = async () => {
  localStorage.setItem("kora_admin_products", JSON.stringify(adminState.products));
  try {
    const response = await fetch("api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminState.products, null, 2)
    });
    if (!response.ok) throw new Error("No se pudo guardar");
    setStatus("Producto guardado en data/products.json.");
  } catch {
    setStatus("Guardado en este navegador. Usa Exportar JSON si no estás corriendo el servidor.");
  }
};

const renderAdminProducts = () => {
  admin.list.innerHTML = adminState.products
    .map(
      (product) => `
        <article class="admin-product-row">
          <img src="${product.image}" alt="${product.title}" />
          <div>
            <h3>${product.title}</h3>
            <p>${product.category} · ${product.size || "Sin medida"} · $${Number(product.price || 0).toLocaleString("es-CO")}</p>
          </div>
          <button type="button" data-edit="${product.id}">Editar</button>
          <button type="button" data-delete="${product.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
};

const fillForm = (product) => {
  admin.id.value = product.id || "";
  admin.title.value = product.title || "";
  admin.category.value = product.category || "";
  admin.image.value = product.image || "";
  admin.description.value = product.description || "";
  admin.size.value = product.size || "";
  admin.stock.value = product.stock || 0;
  admin.price.value = product.price || 0;
  admin.compare.value = product.compareAt || "";
};

const resetForm = () => {
  admin.form.reset();
  admin.id.value = "";
};

admin.imageFile?.addEventListener("change", () => {
  const file = admin.imageFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    admin.image.value = reader.result;
  };
  reader.readAsDataURL(file);
});

admin.form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = admin.id.value || slugify(admin.title.value);
  const product = {
    id,
    title: admin.title.value.trim(),
    category: admin.category.value.trim(),
    image: admin.image.value.trim(),
    description: admin.description.value.trim(),
    size: admin.size.value.trim(),
    price: Number(admin.price.value || 0),
    compareAt: Number(admin.compare.value || 0),
    stock: Number(admin.stock.value || 0)
  };
  const index = adminState.products.findIndex((item) => item.id === id);
  if (index >= 0) adminState.products[index] = product;
  else adminState.products.push(product);
  await saveAdminProducts();
  resetForm();
  renderAdminProducts();
});

admin.list?.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) {
    const product = adminState.products.find((item) => item.id === edit.dataset.edit);
    if (product) fillForm(product);
  }
  if (del) {
    adminState.products = adminState.products.filter((item) => item.id !== del.dataset.delete);
    await saveAdminProducts();
    renderAdminProducts();
  }
});

admin.reset?.addEventListener("click", resetForm);

admin.export?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(adminState.products, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products.json";
  link.click();
  URL.revokeObjectURL(url);
});

loadAdminProducts();
