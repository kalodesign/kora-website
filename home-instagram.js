(() => {
  const grid = document.querySelector(".home-social-grid");
  if (!grid) return;

  fetch("instagram-feed.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Feed aún no conectado");
      return response.json();
    })
    .then(({ posts }) => {
      if (!Array.isArray(posts) || posts.length !== 5) return;
      const cards = posts.map((post, index) => {
        const imageUrl = new URL(post.image);
        const postUrl = new URL(post.permalink);
        if (imageUrl.protocol !== "https:" || postUrl.hostname !== "www.instagram.com" && postUrl.hostname !== "instagram.com") {
          throw new Error("Publicación inválida");
        }

        const link = document.createElement("a");
        link.className = "instagram-post";
        link.href = postUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Ver publicación ${index + 1} de Kora en Instagram`);

        const image = document.createElement("img");
        image.src = imageUrl.href;
        image.alt = post.caption ? post.caption.slice(0, 110) : `Publicación ${index + 1} de Kora`;
        image.loading = "lazy";
        image.decoding = "async";
        link.append(image);

        if (post.type === "VIDEO") {
          const badge = document.createElement("span");
          badge.className = "instagram-post-video";
          badge.setAttribute("aria-hidden", "true");
          badge.textContent = "▶";
          link.append(badge);
        }
        return link;
      });
      grid.replaceChildren(...cards);
      grid.classList.add("is-instagram-feed");
    })
    .catch(() => {
      // Las fotos actuales permanecen visibles hasta conectar la cuenta.
    });
})();
