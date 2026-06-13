// Warstwa dostępu do projektów w Supabase (etap E1) — model PRYWATNY per użytkownik.
// Każdy rekord należy do zalogowanego użytkownika (RLS po user_id; kolumna
// user_id uzupełniana automatycznie DEFAULT auth.uid()). Gdy baza/sesja
// niedostępne, wołający (ProjektProvider) wraca do localStorage.

import { createClient } from "@/utils/supabase/client";
import {
  SEEDY_PRZYKLADOWE,
  type ProjektWlasnyZapis,
} from "./projekty";

interface WierszProjektu {
  klucz: string;
  nazwa: string;
  skrot: string;
  nabor: string;
  wnioskodawca: string;
  okres: string;
  zrodlo: string;
  sekcje: string[] | null;
  szablon: string | null;
  utworzono: string;
}

function zWiersza(w: WierszProjektu): ProjektWlasnyZapis {
  return {
    id: w.klucz,
    nazwa: w.nazwa,
    skrot: w.skrot,
    nabor: w.nabor,
    wnioskodawca: w.wnioskodawca,
    okres: w.okres,
    zrodlo: w.zrodlo,
    sekcje: w.sekcje && w.sekcje.length > 0 ? w.sekcje : undefined,
    szablon:
      w.szablon === "cis" || w.szablon === "swa" ? w.szablon : undefined,
    utworzono: w.utworzono,
  };
}

function doWiersza(z: ProjektWlasnyZapis) {
  return {
    klucz: z.id,
    nazwa: z.nazwa,
    skrot: z.skrot,
    nabor: z.nabor,
    wnioskodawca: z.wnioskodawca,
    okres: z.okres,
    zrodlo: z.zrodlo,
    sekcje: z.sekcje ?? [],
    szablon: z.szablon ?? null,
    utworzono: z.utworzono,
  };
}

/** Klient Supabase lub błąd — gdy baza niedostępna, wołającego łapie provider. */
function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

/** Czy istnieje aktywna sesja (użytkownik zalogowany). */
export async function czySesja(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

/** Pobiera projekty zalogowanego użytkownika (RLS ogranicza do własnych). */
export async function pobierzProjekty(): Promise<ProjektWlasnyZapis[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("projekty")
    .select("*")
    .order("utworzono", { ascending: true });
  if (error) throw error;
  return (data as WierszProjektu[]).map(zWiersza);
}

/** Dodaje lub nadpisuje projekt (upsert po user_id+klucz). */
export async function zapiszProjektDB(
  z: ProjektWlasnyZapis,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("projekty")
    .upsert(doWiersza(z), { onConflict: "user_id,klucz" });
  if (error) throw error;
}

/** Aktualizuje wybrane pola projektu (po kluczu). */
export async function aktualizujProjektDB(
  klucz: string,
  zmiany: Partial<Omit<ProjektWlasnyZapis, "id">>,
): Promise<void> {
  const supabase = klient();
  const patch: Record<string, unknown> = {};
  if (zmiany.nazwa !== undefined) patch.nazwa = zmiany.nazwa;
  if (zmiany.skrot !== undefined) patch.skrot = zmiany.skrot;
  if (zmiany.nabor !== undefined) patch.nabor = zmiany.nabor;
  if (zmiany.wnioskodawca !== undefined) patch.wnioskodawca = zmiany.wnioskodawca;
  if (zmiany.okres !== undefined) patch.okres = zmiany.okres;
  if (zmiany.zrodlo !== undefined) patch.zrodlo = zmiany.zrodlo;
  if (zmiany.sekcje !== undefined) patch.sekcje = zmiany.sekcje ?? [];
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase
    .from("projekty")
    .update(patch)
    .eq("klucz", klucz);
  if (error) throw error;
}

/** Usuwa projekt użytkownika (po kluczu) wraz z jego uczestnikami. */
export async function usunProjektDB(klucz: string): Promise<void> {
  const supabase = klient();
  // uczestnicy najpierw (brak FK kaskady — czyścimy ręcznie)
  await supabase.from("uczestnicy").delete().eq("projekt_id", klucz);
  const { error } = await supabase.from("projekty").delete().eq("klucz", klucz);
  if (error) throw error;
}

/**
 * Zwraca true, jeśli przykładowe projekty zostały już raz zaszczepione
 * (zapisany profil). Dzięki temu usunięte przykłady nie wracają po logowaniu.
 */
export async function czyZasiano(): Promise<boolean> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("profil")
    .select("zasiano")
    .maybeSingle();
  if (error) throw error;
  return !!data?.zasiano;
}

/** Zaszczepia przykładowe projekty i oznacza profil jako zasiany (idempotentnie). */
export async function zasiejPrzykladowe(): Promise<void> {
  const supabase = klient();
  for (const seed of SEEDY_PRZYKLADOWE) {
    const { error } = await supabase
      .from("projekty")
      .upsert(doWiersza(seed), {
        onConflict: "user_id,klucz",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }
  const { error: errProfil } = await supabase
    .from("profil")
    .upsert({ zasiano: true }, { onConflict: "user_id" });
  if (errProfil) throw errProfil;
}
