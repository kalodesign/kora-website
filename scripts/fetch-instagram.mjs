import { writeFile } from "node:fs/promises";

const token = process.env.INSTAGRAM_ACCESS_TOKEN;
if (!token) {
  console.log("Sin conexión de Instagram; se conserva la galería actual.");
  process.exit(0);
}

const endpoint = new URL("https://graph.instagram.com/me/media");
endpoint.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
endpoint.searchParams.set("limit", "5");

const response = await fetch(endpoint, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) {
  throw new Error(`Instagram respondió con estado ${response.status}; no se publicó un feed incompleto.`);
}

const payload = await response.json();
if (!Array.isArray(payload.data)) {
  throw new Error("La respuesta de Instagram no contiene publicaciones.");
}

const posts = payload.data.slice(0, 5).map((post) => ({
  id: String(post.id),
  image: post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url,
  permalink: post.permalink,
  caption: String(post.caption || "").slice(0, 280),
  type: post.media_type,
  timestamp: post.timestamp,
})).filter((post) =>
  post.image?.startsWith("https://") &&
  /^https:\/\/(www\.)?instagram\.com\//.test(post.permalink || "")
);
if (posts.length !== 5) {
  throw new Error("Instagram no devolvió cinco publicaciones con imágenes y enlaces válidos.");
}

await writeFile("instagram-feed.json", JSON.stringify({ updatedAt: new Date().toISOString(), posts }, null, 2) + "\n");
console.log("Se prepararon cinco publicaciones de Instagram.");
