// Cliente único. La fase 2 lo usará después de aplicar Auth y RLS (fase 4).
let client;
export function getSupabase(){if(client)return client;const config=window.KORA_CONFIG;if(!window.supabase||!config?.supabaseUrl||!config?.supabaseAnonKey)throw new Error('No se pudo inicializar Supabase.');client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);return client}
