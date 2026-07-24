// Warstwa dostępu do wspólnych projektów zespołu w Supabase.
// user_id wskazuje konto, które utworzyło rekord, natomiast RLS daje aktywnemu
// zespołowi wspólny dostęp. Logiczny klucz projektu jest unikalny globalnie.

import { createClient } from "@/utils/supabase/client";
import {
  SEEDY_PRZYKLADOWE,
  unikalneProjekty,
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

/** Pobiera wspólne projekty zespołu. */
export async function pobierzProjekty(): Promise<ProjektWlasnyZapis[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("projekty")
    .select("*")
    .order("utworzono", { ascending: true });
  if (error) throw error;
  return unikalneProjekty((data as WierszProjektu[]).map(zWiersza));
}

/** Dodaje lub nadpisuje wspólny projekt po jego logicznym kluczu. */
export async function zapiszProjektDB(
  z: ProjektWlasnyZapis,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("projekty")
    .upsert(doWiersza(z), { onConflict: "klucz" });
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

/**
 * Zaszczepia przykładowe projekty tylko wtedy, gdy wspolna baza jest pusta.
 * Kolejny pracownik nie tworzy dzieki temu duplikatow projektow zespolu.
 */
export async function zasiejPrzykladowe(): Promise<void> {
  const supabase = klient();
  const { count, error: bladLiczby } = await supabase
    .from("projekty")
    .select("id", { count: "exact", head: true });
  if (bladLiczby) throw bladLiczby;
  if ((count ?? 0) === 0) {
    for (const seed of SEEDY_PRZYKLADOWE) {
      const { error } = await supabase
        .from("projekty")
        .upsert(doWiersza(seed), {
          onConflict: "klucz",
          ignoreDuplicates: true,
        });
      if (error) throw error;
    }
  }
  const { error: errProfil } = await supabase
    .from("profil")
    .upsert({ zasiano: true }, { onConflict: "user_id" });
  if (errProfil) throw errProfil;
}
