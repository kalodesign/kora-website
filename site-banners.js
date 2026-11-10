(() => {
  const endpoint = window.koraEndpoint?.("site-content", "");
  const apiKey = window.KORA_CONFIG?.supabaseAnonKey || "";
  if (!endpoint || !apiKey) return;
  const assetUrl = (value) => {
    try { return new URL(String(value || ""), location.href).href; }
    catch { return ""; }
  };
  const apply = (banners, placement, selector) => {
    const banner = banners.filter((item) => item.placement === placement)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0];
    if (!banner?.desktop_image) return;
    const link = document.querySelector(selector);
    const image = link?.querySelector("img");
    if (!link || !image) return;
    image.src = assetUrl(banner.desktop_image);
    image.alt = banner.alt_text || "";
    const picture = image.closest("picture");
    const source = picture?.querySelector("source");
    if (source) {
      source.media = "(max-width: 767px)";
      source.srcset = assetUrl(banner.mobile_image || banner.desktop_image);
      source.sizes = "100vw";
      source.removeAttribute("type");
    }
    if (banner.link_url) link.href = assetUrl(banner.link_url);
    if (banner.alt_text) link.setAttribute("aria-label", banner.alt_text);
  };
  fetch(endpoint, { headers: { apikey: apiKey }, cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("No se pudo cargar el contenido visual.")))
    .then((payload) => {
      const banners = Array.isArray(payload.banners) ? payload.banners : [];
      apply(banners, "home_hero", ".hero-media");
      apply(banners, "llaveros_hero", ".llaveros-hero-link");
      apply(banners, "mascotas_hero", ".mascotas-hero-photo-link");
    })
    .catch((error) => console.warn("No se pudieron actualizar los banners del sitio.", error));
})();
