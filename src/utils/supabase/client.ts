import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Klient Supabase dla przeglądarki. Zwraca null, gdy brak konfiguracji env
 * (środowisko bez podłączonego Supabase) — aplikacja działa wtedy bez
 * logowania zamiast się wywalać.
 */
export const createClient = () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
};
