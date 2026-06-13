// Warstwa dostępu do wpisów ścieżki w Supabase (etap E3) — prywatne per użytkownik.
// Gdy baza/sesja niedostępne, wołający (hook) wraca do localStorage.

import { createClient } from "@/utils/supabase/client";

export type TypWpisu =
  | "diagnoza"
  | "cel"
  | "notatka"
  | "spotkanie"
  | "dokument";

export interface WpisSciezki {
  id: string;
  uczestnikId: string;
  data: string; // ISO yyyy-mm-dd
  typ: TypWpisu;
  tresc: string;
  autor: string;
}

interface WierszWpisu {
  id: string;
  uczestnik_id: string;
  data: string;
  typ: string;
  tresc: string;
  autor: string;
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

/** Pobiera wszystkie wpisy ścieżki danego projektu (RLS ogranicza do własnych). */
export async function pobierzWpisy(projektId: string): Promise<WpisSciezki[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("wpisy_sciezki")
    .select("id, uczestnik_id, data, typ, tresc, autor")
    .eq("projekt_id", projektId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data as WierszWpisu[]).map((w) => ({
    id: w.id,
    uczestnikId: w.uczestnik_id,
    data: w.data,
    typ: w.typ as TypWpisu,
    tresc: w.tresc,
    autor: w.autor,
  }));
}

/** Dodaje wpis (id nadawany po stronie klienta, by zgadzał się z zapisem lokalnym). */
export async function dodajWpisDB(
  projektId: string,
  wpis: WpisSciezki,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("wpisy_sciezki").insert({
    id: wpis.id,
    projekt_id: projektId,
    uczestnik_id: wpis.uczestnikId,
    data: wpis.data,
    typ: wpis.typ,
    tresc: wpis.tresc,
    autor: wpis.autor,
  });
  if (error) throw error;
}

/** Usuwa wpis ścieżki po id. */
export async function usunWpisDB(id: string): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("wpisy_sciezki").delete().eq("id", id);
  if (error) throw error;
}
