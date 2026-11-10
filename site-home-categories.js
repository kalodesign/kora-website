(() => {
  const grid = document.querySelector(".home-category-grid"); const endpoint = window.koraEndpoint?.("site-content", "") || "";
  if (!grid || !endpoint) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  fetch(endpoint, { headers: { apikey: window.KORA_CONFIG?.supabaseAnonKey || "" } }).then((response) => response.ok ? response.json() : null).then((payload) => {
    const categories = payload?.homeCategories;
    if (!Array.isArray(categories) || !categories.length) return;
    grid.innerHTML = categories.map((category) => `<a href="${esc(category.href)}" class="home-category"><img src="${esc(category.image_url)}" alt="${esc(category.alt_text)}" loading="lazy"/><span>${esc(category.title)}<small>${esc(category.action_label || "Descubrir")}</small></span></a>`).join("");
  }).catch(() => {});
})();
