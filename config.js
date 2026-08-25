window.KORA_CONFIG = Object.freeze({
  // Reemplaza TU-PROYECTO por el ID que aparece en la URL de tu proyecto Supabase.
  supabaseFunctionsUrl: "https://TU-PROYECTO.supabase.co/functions/v1"
});

window.koraEndpoint = (function createEndpointResolver() {
  const configuredBase = String(window.KORA_CONFIG?.supabaseFunctionsUrl || "").replace(/\/$/, "");
  const isConfigured = configuredBase && !configuredBase.includes("TU-PROYECTO");

  return (functionName, localFallback) =>
    isConfigured ? `${configuredBase}/${functionName}` : localFallback;
})();
