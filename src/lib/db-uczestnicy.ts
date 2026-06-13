// Warstwa dostępu do uczestników w Supabase (etap E1).
// Mapuje wiersze tabeli `uczestnicy` na model aplikacji i z powrotem.
// Działa w przeglądarce (klient Supabase). Gdy baza/tabela niedostępna,
// funkcje rzucają — ProjektProvider łapie błąd i wraca do localStorage.

import { createClient } from "@/utils/supabase/client";
import type {
  DaneSOWA,
  KategoriaUczestnika,
  StatusUdzialu,
  TypSciezki,
  Uczestnik,
} from "./types";

interface WierszUczestnika {
  id: string;
  projekt_id: string;
  imie: string;
  nazwisko: string;
  kategoria: string;
  sciezka: string;
  cykl: number;
  grupa: string;
  status: string;
  data_przystapienia: string;
  frekwencja: number;
  posiadane_dokumenty: string[];
  etap_sciezki: number;
  postep_sciezki: number;
  sowa: DaneSOWA;
}

function zWiersza(w: WierszUczestnika): Uczestnik {
  return {
    id: w.id,
    imie: w.imie,
    nazwisko: w.nazwisko,
    kategoria: w.kategoria as KategoriaUczestnika,
    sciezka: w.sciezka as TypSciezki,
    cykl: (w.cykl === 2 ? 2 : 1) as 1 | 2,
    grupa: w.grupa,
    status: w.status as StatusUdzialu,
    dataPrzystapienia: w.data_przystapienia,
    frekwencja: w.frekwencja,
    posiadaneDokumenty: w.posiadane_dokumenty ?? [],
    etapSciezki: (w.etap_sciezki ?? 0) as 0 | 1 | 2 | 3,
    postepSciezki: w.postep_sciezki ?? 0,
    sowa: w.sowa ?? {},
  };
}

function doWiersza(u: Uczestnik, projektId: string) {
  return {
    projekt_id: projektId,
    imie: u.imie,
    nazwisko: u.nazwisko,
    kategoria: u.kategoria,
    sciezka: u.sciezka,
    cykl: u.cykl,
    grupa: u.grupa,
    status: u.status,
    data_przystapienia: u.dataPrzystapienia,
    frekwencja: u.frekwencja,
    posiadane_dokumenty: u.posiadaneDokumenty,
    etap_sciezki: u.etapSciezki,
    postep_sciezki: u.postepSciezki,
    sowa: u.sowa ?? {},
  };
}

/** Czy logowanie/baza są w ogóle skonfigurowane (zmienne env). */
export function bazaDostepna(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

/** Klient Supabase lub błąd — gdy baza niedostępna, wołającego łapie provider. */
function klient() {
  const supabase = createClient(); // createClient z utils/supabase/client
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

/** Pobiera uczestników danego projektu z bazy. */
export async function pobierzUczestnikow(
  projektId: string,
): Promise<Uczestnik[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("uczestnicy")
    .select("*")
    .eq("projekt_id", projektId)
    .order("nazwisko", { ascending: true });
  if (error) throw error;
  return (data as WierszUczestnika[]).map(zWiersza);
}

/** Dodaje jednego uczestnika; zwraca zapisany rekord (z nadanym id). */
export async function dodajUczestnikaDB(
  u: Uczestnik,
  projektId: string,
): Promise<Uczestnik> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("uczestnicy")
    .insert(doWiersza(u, projektId))
    .select("*")
    .single();
  if (error) throw error;
  return zWiersza(data as WierszUczestnika);
}

/** Zastępuje całą bazę uczestników projektu (import): usuwa i wstawia od nowa. */
export async function zastapUczestnikow(
  lista: Uczestnik[],
  projektId: string,
): Promise<Uczestnik[]> {
  const supabase = klient();
  const { error: errDel } = await supabase
    .from("uczestnicy")
    .delete()
    .eq("projekt_id", projektId);
  if (errDel) throw errDel;
  if (lista.length === 0) return [];
  const { data, error } = await supabase
    .from("uczestnicy")
    .insert(lista.map((u) => doWiersza(u, projektId)))
    .select("*");
  if (error) throw error;
  return (data as WierszUczestnika[]).map(zWiersza);
}

/** Usuwa wszystkich uczestników projektu (np. „Wyczyść import”). */
export async function usunUczestnikowProjektu(
  projektId: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("uczestnicy")
    .delete()
    .eq("projekt_id", projektId);
  if (error) throw error;
}
