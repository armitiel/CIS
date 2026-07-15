// Warstwa dostępu do obecności w Supabase (etap E2) — prywatne per użytkownik.
// Gdy baza/sesja niedostępne, wołający (hook useObecnosci) wraca do localStorage.

import { createClient } from "@/utils/supabase/client";
import type { Znak } from "@/lib/oznaczenia-obecnosci";

// p=obecny(O) · a=nieob. nieusprawiedliwiony(NN)
// l=historyczne L4 · l21=L4 do 21 dni · l22=L4 powyżej 21 dni · w=dzień wolny
// (NU usunięte — nie wynika z ustawy o zatrudnieniu socjalnym)
export type { Znak };

export interface WpisObecnosci {
  uczestnikId: string;
  data: string; // ISO yyyy-mm-dd
  znak: Znak;
}

interface WierszObecnosci {
  uczestnik_id: string;
  data: string;
  znak: Znak;
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

/** Pobiera wszystkie wpisy obecności danego projektu (RLS ogranicza do własnych). */
export async function pobierzObecnosci(
  projektId: string,
): Promise<WpisObecnosci[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("obecnosci")
    .select("uczestnik_id, data, znak")
    .eq("projekt_id", projektId);
  if (error) throw error;
  return (data as WierszObecnosci[]).map((w) => ({
    uczestnikId: w.uczestnik_id,
    data: w.data,
    znak: w.znak,
  }));
}

/** Zapisuje (lub nadpisuje) znak obecności uczestnika w danym dniu. */
export async function zapiszObecnoscDB(
  projektId: string,
  uczestnikId: string,
  data: string,
  znak: Znak,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("obecnosci").upsert(
    { projekt_id: projektId, uczestnik_id: uczestnikId, data, znak },
    { onConflict: "user_id,projekt_id,uczestnik_id,data" },
  );
  if (error) throw error;
}

/** Usuwa znak obecności (powrót do stanu „brak wpisu"). */
export async function usunObecnoscDB(
  projektId: string,
  uczestnikId: string,
  data: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("obecnosci")
    .delete()
    .eq("projekt_id", projektId)
    .eq("uczestnik_id", uczestnikId)
    .eq("data", data);
  if (error) throw error;
}
