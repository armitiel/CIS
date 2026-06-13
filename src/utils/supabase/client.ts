import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Klient Supabase dla przeglądarki. Zwraca null, gdy brak konfiguracji env
 * (środowisko bez podłączonego Supabase) — aplikacja działa wtedy bez
 * logowania zamiast się wywalać.
 */
export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) return null;
  return createBrowserClient(supabaseUrl, supabaseKey);
};
