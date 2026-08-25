window.KORA_CONFIG = Object.freeze({
  supabaseFunctionsUrl: "https://hapveghsbqnhkeuraxow.supabase.co/functions/v1"
});

window.koraEndpoint = (function createEndpointResolver() {
  const configuredBase = String(window.KORA_CONFIG?.supabaseFunctionsUrl || "").replace(/\/$/, "");
  const isConfigured = configuredBase && !configuredBase.includes("TU-PROYECTO");

  return (functionName, localFallback) =>
    isConfigured ? `${configuredBase}/${functionName}` : localFallback;
})();
