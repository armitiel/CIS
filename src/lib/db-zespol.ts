import { createClient } from "@/utils/supabase/client";
import {
  normalizujEmailZespolu,
  poprawnyEmailZespolu,
} from "./zespol-reguly";

export const ROLE_DOSTEPU = ["administrator", "pracownik"] as const;
export type RolaDostepu = (typeof ROLE_DOSTEPU)[number];

export interface CzlonekZespolu {
  email: string;
  rola: RolaDostepu;
  aktywny: boolean;
  nazwa: string | null;
  /** Klucze projektów przypisanych pracownikowi. Pusto = brak ograniczenia (widzi wszystkie). */
  projekty: string[];
  dodany: string;
}

// Odczyt odporny na brak kolumny „projekty" (gdy migracja jeszcze niewykonana).
function znormalizujCzlonka(w: Record<string, unknown>): CzlonekZespolu {
  return {
    email: String(w.email ?? ""),
    rola: (w.rola as RolaDostepu) ?? "pracownik",
    aktywny: w.aktywny !== false,
    nazwa: (w.nazwa as string | null) ?? null,
    projekty: Array.isArray(w.projekty) ? (w.projekty as string[]) : [],
    dodany: String(w.dodany ?? ""),
  };
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

export async function pobierzMojeUprawnienia(): Promise<CzlonekZespolu | null> {
  const supabase = klient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data, error } = await supabase
    .from("zespol")
    .select("*")
    .eq("email", normalizujEmailZespolu(user.email))
    .maybeSingle();
  if (error) throw error;
  return data ? znormalizujCzlonka(data as Record<string, unknown>) : null;
}

export async function pobierzZespol(): Promise<CzlonekZespolu[]> {
  const { data, error } = await klient()
    .from("zespol")
    .select("*")
    .order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w) => znormalizujCzlonka(w as Record<string, unknown>));
}

/** Ustawia listę projektów przypisanych pracownikowi (tylko administrator; wymaga kolumny „projekty"). */
export async function ustawProjektyPracownika(
  email: string,
  projekty: string[],
): Promise<void> {
  const { error } = await klient()
    .from("zespol")
    .update({ projekty })
    .eq("email", normalizujEmailZespolu(email));
  if (error) throw error;
}

export async function dodajPracownika(
  email: string,
  rola: RolaDostepu,
  nazwa?: string,
): Promise<void> {
  const adres = normalizujEmailZespolu(email);
  if (!poprawnyEmailZespolu(adres)) throw new Error("Wpisz poprawny adres e-mail.");
  const { error } = await klient().from("zespol").upsert(
    { email: adres, rola, aktywny: true, nazwa: nazwa?.trim() || null },
    { onConflict: "email" },
  );
  if (error) throw error;
}

export async function zmienPracownika(
  email: string,
  zmiany: Partial<Pick<CzlonekZespolu, "rola" | "aktywny" | "nazwa">>,
): Promise<void> {
  const { error } = await klient()
    .from("zespol")
    .update(zmiany)
    .eq("email", normalizujEmailZespolu(email));
  if (error) throw error;
}
