(() => {
  const form = document.querySelector("#contact-project-form");
  const fileInput = document.querySelector("#contact-reference");
  const fileName = document.querySelector("#contact-file-name");
  const status = document.querySelector("#contact-form-status");
  if (!form || !fileInput || !fileName || !status) return;

  const maxFileSize = 15 * 1024 * 1024;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.setCustomValidity("");
    status.textContent = "";

    if (!file) {
      fileName.textContent = "Seleccionar archivo";
      return;
    }

    if (file.size > maxFileSize) {
      fileInput.setCustomValidity("El archivo debe pesar máximo 15 MB.");
      fileName.textContent = "Archivo demasiado grande";
      status.textContent = "El archivo debe pesar máximo 15 MB.";
      status.className = "contact-form-status is-error";
      return;
    }

    fileName.textContent = file.name;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    if (!form.reportValidity()) return;

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Enviando solicitud";

    try {
      const contactEndpoint = window.koraEndpoint?.("contact", "/api/contact") || "/api/contact";
      const response = await fetch(contactEndpoint, {
        method: "POST",
        body: new FormData(form)
      });
      if (!response.ok) throw new Error("No se pudo enviar");

      status.className = "contact-form-status is-success";
      status.textContent = "Gracias. Recibimos la información de tu proyecto y pronto nos pondremos en contacto.";
      submitButton.textContent = "Solicitud enviada";
      form.reset();
      fileName.textContent = "Seleccionar archivo";
    } catch {
      status.className = "contact-form-status is-error";
      status.textContent = "No pudimos enviar la solicitud. Inténtalo de nuevo o escríbenos a info@kora.co.";
      submitButton.textContent = "Enviar solicitud";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
