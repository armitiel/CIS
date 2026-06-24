// Warstwa dostępu do listy kadry (osób zatrudnionych) w Supabase (etap E9) —
// prywatne per użytkownik. Gdy baza/sesja niedostępne, wołający (hook) wraca
// do localStorage.

import { createClient } from "@/utils/supabase/client";
import { normTyp, type TypZajec } from "./db-grafik-kadry";

export interface OsobaKadry {
  id: string;
  imie: string;
  nazwisko: string;
  stanowisko: string;
  wymiar: string; // wymiar etatu / limit godzin (na kartę G-02)
  godzinaOd: string; // domyślna godzina rozpoczęcia ("08:00")
  godzinaDo: string; // domyślna godzina zakończenia ("16:00")
  typDomyslny: TypZajec; // domyślny rodzaj zajęć
  aktywny: boolean;
}

interface WierszKadry {
  id: string;
  imie: string;
  nazwisko: string;
  stanowisko: string;
  wymiar: string;
  godzina_od: string;
  godzina_do: string;
  typ_domyslny: string;
  aktywny: boolean;
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

function zWiersza(w: WierszKadry): OsobaKadry {
  return {
    id: w.id,
    imie: w.imie,
    nazwisko: w.nazwisko,
    stanowisko: w.stanowisko,
    wymiar: w.wymiar,
    godzinaOd: w.godzina_od || "08:00",
    godzinaDo: w.godzina_do || "16:00",
    typDomyslny: normTyp(w.typ_domyslny),
    aktywny: w.aktywny ?? true,
  };
}

function doWiersza(o: OsobaKadry, projektId: string) {
  return {
    id: o.id,
    projekt_id: projektId,
    imie: o.imie,
    nazwisko: o.nazwisko,
    stanowisko: o.stanowisko,
    wymiar: o.wymiar,
    godzina_od: o.godzinaOd,
    godzina_do: o.godzinaDo,
    typ_domyslny: o.typDomyslny,
    aktywny: o.aktywny,
  };
}

/** Pobiera całą kadrę danego projektu (RLS ogranicza do własnych). */
export async function pobierzKadre(projektId: string): Promise<OsobaKadry[]> {
  const supabase = klient();
  const { data, error } = await supabase
    .from("kadra")
    .select("*")
    .eq("projekt_id", projektId)
    .order("nazwisko", { ascending: true });
  if (error) throw error;
  return (data as WierszKadry[]).map(zWiersza);
}

/** Dodaje lub nadpisuje osobę (upsert po id nadanym po stronie klienta). */
export async function zapiszOsobeDB(
  o: OsobaKadry,
  projektId: string,
): Promise<void> {
  const supabase = klient();
  const { error } = await supabase
    .from("kadra")
    .upsert(doWiersza(o, projektId), { onConflict: "id" });
  if (error) throw error;
}

/** Usuwa osobę po id. */
export async function usunOsobeDB(id: string): Promise<void> {
  const supabase = klient();
  const { error } = await supabase.from("kadra").delete().eq("id", id);
  if (error) throw error;
}
