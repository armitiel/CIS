// Warstwa dostępu do grafiku kadry w Supabase (etap E9) — prywatne per
// użytkownik. Wpis = jeden blok pracy osoby w danym dniu (godziny od-do, typ).
// Gdy baza/sesja niedostępne, wołający (hook) wraca do localStorage.

import { createClient } from "@/utils/supabase/client";

export type TypZajec = "grupowe" | "indywidualne";

/** Bezpiecznie normalizuje wartość typu zajęć ze stringa. */
export function normTyp(v: unknown): TypZajec {
  return v === "indywidualne" ? "indywidualne" : "grupowe";
}

/** Czytelna etykieta rodzaju zajęć. */
export function etykietaTypu(t: TypZajec): string {
  return t === "indywidualne" ? "Indywidualne" : "Grupowe";
}

export interface WpisGrafiku {
  id: string;
  kadraId: string;
  data: string; // ISO yyyy-mm-dd
  godzinaOd: string; // "08:00"
  godzinaDo: string; // "16:00"
  typ: TypZajec;
  zadanie: string; // realizowane zadanie / forma wsparcia
}

interface WierszGrafiku {
  id: string;
  kadra_id: string;
  data: string;
  godzina_od: string;
  godzina_do: string;
  typ: string;
  zadanie: string;
}

/** Liczba godzin między "HH:MM" a "HH:MM" (0 gdy dane niepełne lub do<od). */
export function liczbaGodzin(od: string, doG: string): number {
  const m = (t: string): number | null => {
    const r = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!r) return null;
    return Number(r[1]) * 60 + Number(r[2]);
  };
  const a = m(od);
  const b = m(doG);
  if (a === null || b === null || b <= a) return 0;
  return (b - a) / 60;
}

/** Formatuje liczbę godzin po polsku ("6", "7,5"). */
export function formatGodziny(h: number): string {
  return h
    .toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .replace(".", ",");
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

function zWiersza(w: WierszGrafiku): WpisGrafiku {
  return {
    id: w.id,
    kadraId: w.kadra_id,
    data: w.data,
    godzinaOd: w.godzina_od,
    godzinaDo: w.godzina_do,
    typ: normTyp(w.typ),
    zadanie: w.zadanie ?? "",
  };
}

function doWiersza(w: WpisGrafiku, projektId: string) {
  return {
    id: w.id,
    projekt_id: projektId,
    kadra_id: w.kadraId,
    data: w.data,
    godzina_od: w.godzinaOd,
    godzina_do: w.godzinaDo,
    typ: w.typ,
    zadanie: w.zadanie,
  };
}

/** Pobiera cały grafik danego projektu (RLS ogranicza do własnych). */
export async function pobierzGrafik(projektId: string): Promise<WpisGrafiku[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("grafik_kadry")
    .select("*")
    .eq("projekt_id", projektId)
    .order("data", { ascending: true })
    .order("godzina_od", { ascending: true });
  if (error) throw error;
  return (data as WierszGrafiku[]).map(zWiersza);
}

/** Dodaje lub nadpisuje wpis grafiku (upsert po id nadanym po stronie klienta). */
export async function zapiszWpisDB(
  w: WpisGrafiku,
  projektId: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("grafik_kadry")
    .upsert(doWiersza(w, projektId), { onConflict: "id" });
  if (error) throw error;
}

/** Usuwa wpis grafiku po id. */
export async function usunWpisDB(id: string): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("grafik_kadry").delete().eq("id", id);
  if (error) throw error;
}

/** Usuwa wszystkie wpisy danej osoby (np. po skasowaniu jej z kadry). */
export async function usunWpisyOsobyDB(
  kadraId: string,
  projektId: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("grafik_kadry")
    .delete()
    .eq("projekt_id", projektId)
    .eq("kadra_id", kadraId);
  if (error) throw error;
}
