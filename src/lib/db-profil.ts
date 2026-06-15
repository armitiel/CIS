// Profil koordynatora — nazwa wyświetlana i rola, zapisywane w tabeli profil
// (per użytkownik, RLS z E1). Gdy brak Supabase/sesji, zwraca dane z logowania
// (metadane OAuth) albo null. Nazwa „efektywna": profil → metadane → e-mail.

import { createClient } from "@/utils/supabase/client";

export interface Koordynator {
  nazwa: string; // efektywna nazwa wyświetlana
  rola: string; // np. „Koordynator"
  email: string;
}

export const ROLE_KOORDYNATORA = [
  "Koordynator projektu",
  "Kierownik projektu",
  "Specjalista ds. reintegracji",
  "Pracownik socjalny",
  "Doradca zawodowy",
  "Asystent projektu",
  "Inna",
] as const;

/** Dane zalogowanego koordynatora (lub null, gdy brak sesji/Supabase). */
export async function pobierzProfil(): Promise<Koordynator | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const domyslna =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (user.email ? user.email.split("@")[0] : "");

  let nazwa = domyslna;
  let rola = "";
  try {
    const { data } = await supabase
      .from("profil")
      .select("nazwa_wyswietlana, rola")
      .maybeSingle();
    if (data?.nazwa_wyswietlana) nazwa = data.nazwa_wyswietlana as string;
    if (data?.rola) rola = data.rola as string;
  } catch {
    /* kolumny mogą nie istnieć w starszej bazie — zostają metadane */
  }
  return { nazwa, rola, email: user.email ?? "" };
}

/** Zapisuje nazwę wyświetlaną i rolę koordynatora. */
export async function zapiszProfil(nazwa: string, rola: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Wymagane zalogowanie.");
  const { error } = await supabase.from("profil").upsert(
    {
      user_id: user.id,
      nazwa_wyswietlana: nazwa.trim() || null,
      rola: rola.trim() || null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
