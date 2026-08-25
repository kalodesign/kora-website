import {
  getSupabaseAdmin,
  handleOptions,
  isAllowedBrowserOrigin,
  jsonResponse,
  textValue,
  uploadFormFile
} from "../_shared/http.ts";
import { emailLayout, escapeHtml, sendKoraEmail } from "../_shared/email.ts";

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".pdf", ".stl", ".obj"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return handleOptions(request);
  if (request.method !== "POST") return jsonResponse(request, { error: "Metodo no permitido" }, 405);
  if (!isAllowedBrowserOrigin(request)) return jsonResponse(request, { error: "Origen no permitido" }, 403);

  try {
    const formData = await request.formData();
    const name = textValue(formData, "name", 120);
    const email = textValue(formData, "email", 180).toLowerCase();
    const projectType = textValue(formData, "projectType", 60);
    const details = textValue(formData, "details", 5000);

    if (!name || !email.includes("@") || !projectType || !details) {
      return jsonResponse(request, { error: "Completa los campos obligatorios" }, 400);
    }

    const supabase = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const reference = await uploadFormFile({
      supabase,
      file: formData.get("reference"),
      bucket: "contact-references",
      recordId: id,
      allowedExtensions
    });

    const { error } = await supabase.from("contact_requests").insert({
      id,
      name,
      email,
      company: textValue(formData, "company", 180),
      project_type: projectType,
      quantity: textValue(formData, "quantity", 20),
      budget: textValue(formData, "budget", 60),
      details,
      reference
    });
    if (error) throw error;

    await sendKoraEmail({
      subject: `Nueva cotizacion: ${name}`,
      replyTo: email,
      idempotencyKey: `contact-${id}`,
      text: `Nueva cotizacion\nNombre: ${name}\nCorreo: ${email}\nEmpresa: ${textValue(formData, "company", 180)}\nTipo: ${projectType}\nCantidad: ${textValue(formData, "quantity", 20)}\nPresupuesto: ${textValue(formData, "budget", 60)}\n\nDetalles:\n${details}`,
      html: emailLayout("Nueva cotizacion", `
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(textValue(formData, "company", 180) || "No indicada")}</p>
        <p><strong>Tipo:</strong> ${escapeHtml(projectType)}</p>
        <p><strong>Cantidad:</strong> ${escapeHtml(textValue(formData, "quantity", 20) || "No indicada")}</p>
        <p><strong>Presupuesto:</strong> ${escapeHtml(textValue(formData, "budget", 60) || "No indicado")}</p>
        <p><strong>Detalles:</strong><br>${escapeHtml(details).replaceAll("\n", "<br>")}</p>
        ${reference ? `<p><strong>Referencia adjunta:</strong> ${escapeHtml(reference.originalName)}</p>` : ""}
      `)
    }).catch((emailError) => console.error("contact email", emailError));

    return jsonResponse(request, { ok: true, id }, 201);
  } catch (error) {
    console.error("contact", error);
    const message = error instanceof Error && error.message.includes("formato")
      ? error.message
      : "No se pudo guardar la solicitud";
    return jsonResponse(request, { error: message }, 400);
  }
});
