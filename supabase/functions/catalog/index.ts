import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { getCatalogProducts } from "../_shared/catalog.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "GET") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
  try {
    return jsonResponse(request, { products: await getCatalogProducts() });
  } catch (error) {
    console.error("catalog", error);
    return jsonResponse(request, { error: "No se pudo cargar el catalogo" }, 500);
  }
});
