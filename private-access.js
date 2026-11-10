(() => {
  const config = window.KORA_CONFIG || {};
  const client = config.supabaseUrl && config.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const form = document.querySelector("#private-login-form");
  const email = document.querySelector("#private-email");
  const password = document.querySelector("#private-password");
  const passwordToggle = document.querySelector("#private-password-toggle");
  const status = document.querySelector("#private-status");
  const endpoint = window.koraEndpoint?.("admin-catalog", "");

  if (!client || !endpoint) {
    status.textContent = "Falta configurar el acceso seguro.";
    return;
  }

  const verify = async (session) => {
    const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + session.access_token } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No tienes permiso para ingresar.");
  };
  const openPrivateArea = async (session) => {
    await verify(session);
    window.location.replace("admin/");
  };
  const clearAccess = async (message) => {
    await client.auth.signOut({ scope: "local" });
    password.value = "";
    status.textContent = message;
  };
  const clearPassword = () => {
    password.value = "";
    password.type = "password";
    password.setAttribute("readonly", "");
    passwordToggle.setAttribute("aria-label", "Mostrar contrasena");
    passwordToggle.setAttribute("title", "Mostrar contrasena");
    passwordToggle.innerHTML = '<i data-lucide="eye" aria-hidden="true"></i>';
    window.lucide?.createIcons();
  };
  const ready = client.auth.signOut({ scope: "local" }).finally(() => {
    form.reset();
    clearPassword();
  });

  window.addEventListener("pageshow", () => {
    clearPassword();
    window.setTimeout(() => { if (document.activeElement !== password) clearPassword(); }, 100);
    window.setTimeout(() => { if (document.activeElement !== password) clearPassword(); }, 500);
  });
  password.addEventListener("focus", () => password.removeAttribute("readonly"));
  passwordToggle.addEventListener("click", () => {
    const reveal = password.type === "password";
    password.type = reveal ? "text" : "password";
    passwordToggle.setAttribute("aria-label", reveal ? "Ocultar contrasena" : "Mostrar contrasena");
    passwordToggle.setAttribute("title", reveal ? "Ocultar contrasena" : "Mostrar contrasena");
    passwordToggle.innerHTML = '<i data-lucide="' + (reveal ? "eye-off" : "eye") + '" aria-hidden="true"></i>';
    window.lucide?.createIcons();
    password.focus();
  });
  window.lucide?.createIcons();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await ready;
    status.textContent = "Verificando acceso...";
    const { data, error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    if (error || !data.session) { status.textContent = error?.message || "No fue posible iniciar sesion."; return; }
    try { await openPrivateArea(data.session); } catch (accessError) { await clearAccess(accessError.message); }
  });
})();
