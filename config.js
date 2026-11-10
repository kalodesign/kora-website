window.KORA_CONFIG = Object.freeze({
  supabaseFunctionsUrl: "https://hapveghsbqnhkeuraxow.supabase.co/functions/v1",
  supabaseUrl: "https://hapveghsbqnhkeuraxow.supabase.co",
  supabaseAnonKey: "sb_publishable_Hl7EO14GkByGlYP1Q6if8g_tx2lIRlr",
  fallbackShippingCop: 20000
});

window.koraEndpoint = (function createEndpointResolver() {
  const configuredBase = String(window.KORA_CONFIG?.supabaseFunctionsUrl || "").replace(/\/$/, "");
  const isConfigured = configuredBase && !configuredBase.includes("TU-PROYECTO");

  return (functionName, localFallback) =>
    isConfigured ? `${configuredBase}/${functionName}` : localFallback;
})();
