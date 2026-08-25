import {
  getSupabaseAdmin,
  handleOptions,
  isAllowedBrowserOrigin,
  jsonResponse,
  textValue,
  uploadFormFile
} from "../_shared/http.ts";
import { emailLayout, escapeHtml, sendKoraEmail } from "../_shared/email.ts";

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);

  try {
    const formData = await request.formData();
    const clientName = textValue(formData, "client-name", 120);
    const petName = textValue(formData, "pet-name", 120);
    const petType = textValue(formData, "pet-type", 60);

    if (!clientName || !petName || !petType) {
      return jsonResponse(request, { error: "Completa los campos obligatorios" }, 400);
    }

    const supabase = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const photo = await uploadFormFile({
      supabase,
      file: formData.get("pet-photo"),
      bucket: "pet-photos",
      recordId: id,
      allowedExtensions
    });

    const { error } = await supabase.from("pet_requests").insert({
      id,
      client_name: clientName,
      pet_name: petName,
      pet_type: petType,
      pet_color: textValue(formData, "pet-color", 120),
      details: textValue(formData, "pet-details", 3000),
      photo
    });
    if (error) throw error;

    const petColor = textValue(formData, "pet-color", 120);
    const details = textValue(formData, "pet-details", 3000);
    await sendKoraEmail({
      subject: `Nueva solicitud de mascota: ${petName}`,
      idempotencyKey: `pet-${id}`,
      text: `Nueva solicitud de mascota\nCliente: ${clientName}\nMascota: ${petName}\nTipo: ${petType}\nColor: ${petColor}\n\nDetalles:\n${details}`,
      html: emailLayout("Nueva solicitud de mascota", `
        <p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
        <p><strong>Mascota:</strong> ${escapeHtml(petName)}</p>
        <p><strong>Tipo:</strong> ${escapeHtml(petType)}</p>
        <p><strong>Color:</strong> ${escapeHtml(petColor || "No indicado")}</p>
        <p><strong>Detalles:</strong><br>${escapeHtml(details || "No indicados").replaceAll("\n", "<br>")}</p>
        ${photo ? `<p><strong>Foto recibida:</strong> ${escapeHtml(photo.originalName)}</p>` : ""}
      `)
    }).catch((emailError) => console.error("pet email", emailError));

    return jsonResponse(request, { ok: true, id }, 201);
  } catch (error) {
    console.error("pet-request", error);
    const message = error instanceof Error && error.message.includes("formato")
      ? error.message
      : "No se pudo guardar la solicitud";
    return jsonResponse(request, { error: message }, 400);
  }
});
