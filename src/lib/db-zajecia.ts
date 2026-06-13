// Warstwa dostępu do harmonogramu zajęć w Supabase (etap E4) — prywatne per użytkownik.
// Gdy baza/sesja niedostępne, wołający (hook) wraca do localStorage.

import { createClient } from "@/utils/supabase/client";
import type { KolorZajec } from "./types";

export interface Zajecie {
  id: string;
  data: string; // ISO yyyy-mm-dd
  godzina: string; // "09:00"
  godzinaDo: string; // "12:00" lub ""
  nazwa: string;
  typ: string;
  prowadzacy: string;
  grupa: string;
  kolor: KolorZajec;
  osob: number;
}

interface WierszZajec {
  id: string;
  data: string;
  godzina: string;
  godzina_do: string;
  nazwa: string;
  typ: string;
  prowadzacy: string;
  grupa: string;
  kolor: string;
  osob: number;
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

function zWiersza(w: WierszZajec): Zajecie {
  return {
    id: w.id,
    data: w.data,
    godzina: w.godzina,
    godzinaDo: w.godzina_do,
    nazwa: w.nazwa,
    typ: w.typ,
    prowadzacy: w.prowadzacy,
    grupa: w.grupa,
    kolor: (["green", "blue", "amber"].includes(w.kolor)
      ? w.kolor
      : "green") as KolorZajec,
    osob: w.osob ?? 0,
  };
}

function doWiersza(z: Zajecie, projektId: string) {
  return {
    id: z.id,
    projekt_id: projektId,
    data: z.data,
    godzina: z.godzina,
    godzina_do: z.godzinaDo,
    nazwa: z.nazwa,
    typ: z.typ,
    prowadzacy: z.prowadzacy,
    grupa: z.grupa,
    kolor: z.kolor,
    osob: z.osob,
  };
}

/** Pobiera wszystkie zajęcia danego projektu (RLS ogranicza do własnych). */
export async function pobierzZajecia(projektId: string): Promise<Zajecie[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("zajecia")
    .select("*")
    .eq("projekt_id", projektId)
    .order("data", { ascending: true })
    .order("godzina", { ascending: true });
  if (error) throw error;
  return (data as WierszZajec[]).map(zWiersza);
}

/** Dodaje lub nadpisuje zajęcia (upsert po id nadanym po stronie klienta). */
export async function zapiszZajecieDB(
  z: Zajecie,
  projektId: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("zajecia")
    .upsert(doWiersza(z, projektId), { onConflict: "id" });
  if (error) throw error;
}

/** Usuwa zajęcia po id. */
export async function usunZajecieDB(id: string): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("zajecia").delete().eq("id", id);
  if (error) throw error;
}
