// Rejestr projektów Stowarzyszenia "Pomost" obsługiwanych w aplikacji.
// Każdy projekt ma własną specyfikację dokumentów i własną bazę uczestników.

import { specyfikacjaCIS, type SpecyfikacjaProjektu } from "./projekt-spec";
import { uczestnicy as uczestnicyCIS } from "./mock-data";
import type { Uczestnik } from "./types";

export interface Projekt {
  id: string;
  nazwa: string;
  skrot: string;
  nabor: string;
  spec: SpecyfikacjaProjektu;
  /** uczestnicy startowi (dane fikcyjne) — można nadpisać importem z Excel/CSV */
  uczestnicyDomyslni: Uczestnik[];
}

/** Specyfikacja wstępna projektu 6.8 — do uzupełnienia o pełny katalog formularzy. */
export const specyfikacjaSWA: SpecyfikacjaProjektu = {
  id: "swa-6.8",
  nazwa: "Smartfon w Akcji",
  nabor: "FELB.06.08-IZ.00-0004/25",
  wnioskodawca: "Stowarzyszenie na Rzecz Edukacji „Pomost”",
  okres: "2025–2026",
  zrodlo: "Obowiązujący katalog wzorów SWA (folder „Wzory — Formularze_projektowe”)",
  dokumenty: [
    {
      id: "swa-a-01", symbol: "SWA_A-01", nazwa: "Formularz zgłoszeniowy uczestnika (pakiet)",
      sekcja: "A", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "rekrutacja",
      podpisUczestnika: "1 podpis na pakiecie", generowalny: true,
      opis: "Dane uczestnika w strukturze SOWA + oświadczenia i RODO (synchronizowane z plikiem Import)",
    },
    {
      id: "swa-a-02", symbol: "SWA_A-02", nazwa: "Regulamin rekrutacji i uczestnictwa",
      sekcja: "A", rodzaj: "organizacyjny", dotyczy: "wszyscy", moment: "rekrutacja",
      podpisUczestnika: "bez podpisu", generowalny: true,
      opis: "Dokument projektowy — publikowany, nie podpisywany przez uczestników",
    },
    {
      id: "swa-b-01", symbol: "SWA_B-01", nazwa: "Umowa uczestnictwa w projekcie",
      sekcja: "B", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "przystąpienie",
      podpisUczestnika: "1 podpis", generowalny: true,
      opis: "Warunki udziału w projekcie",
    },
    {
      id: "swa-b-02", symbol: "SWA_B-02", nazwa: "Arkusz diagnozy kompleksowej",
      sekcja: "B", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "udział",
      podpisUczestnika: "podpis przy diagnozie", generowalny: true,
      opis: "Diagnoza umiejętności podstawowych — podstawa indywidualnej ścieżki edukacyjnej",
    },
    {
      id: "swa-b-03", symbol: "SWA_B-03", nazwa: "Wniosek o dostosowania dla osoby z niepełnosprawnością",
      sekcja: "B", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "ad hoc",
      podpisUczestnika: "1 podpis (dot. OzN)", generowalny: true,
      opis: "Dostosowanie form wsparcia dla osób z niepełnosprawnościami",
    },
    {
      id: "swa-c-01", symbol: "SWA_C-01", nazwa: "Lista obecności na zajęciach",
      sekcja: "C", rodzaj: "grupowy", dotyczy: "wszyscy", moment: "cyklicznie",
      podpisUczestnika: "1 podpis na zajęcia", generowalny: true,
      opis: "Listy grupowe z zajęć (cykle szkoleniowe)",
    },
    {
      id: "swa-c-05", symbol: "SWA_C-05", nazwa: "Protokół przekazania smartfona",
      sekcja: "C", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "udział",
      podpisUczestnika: "1 podpis przy odbiorze", generowalny: true,
      opis: "Potwierdzenie przekazania sprzętu (smartfona) uczestnikowi",
    },
    {
      id: "swa-d-01", symbol: "SWA_D-01", nazwa: "Arkusz walidacji + ankieta POST",
      sekcja: "D", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "zakończenie",
      podpisUczestnika: "bez podpisu uczestnika — kod + prowadzący pomiar", generowalny: true,
      opis: "Pomiar końcowy kompetencji i walidacja efektów wsparcia",
    },
    {
      id: "swa-d-02", symbol: "SWA_D-02", nazwa: "Certyfikat / zaświadczenie o ukończeniu",
      sekcja: "D", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "zakończenie",
      podpisUczestnika: "bez podpisu uczestnika", generowalny: true,
      opis: "Potwierdzenie ukończenia udziału w projekcie",
    },
    {
      id: "swa-d-03", symbol: "SWA_D-03", nazwa: "Ankieta ewaluacyjna — trwałość",
      sekcja: "D", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "ad hoc",
      podpisUczestnika: "1 podpis (po projekcie)", generowalny: true,
      opis: "Badanie trwałości efektów po zakończeniu wsparcia",
    },
    {
      id: "swa-f-01", symbol: "SWA_F-01", nazwa: "Ankieta kompetencji PRE (pomiar wejściowy)",
      sekcja: "F", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "udział",
      podpisUczestnika: "bez podpisu uczestnika — kod + prowadzący pomiar", generowalny: true,
      opis: "Pomiar wejściowy kompetencji przy diagnozie",
    },
    {
      id: "swa-g-04", symbol: "SWA_G-04", nazwa: "Rozliczenie kosztów dojazdu",
      sekcja: "G", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "ad hoc",
      podpisUczestnika: "1 podpis", generowalny: true,
      opis: "Zwrot kosztów dojazdu uczestnika (gdy dotyczy)",
    },
  ],
  // Nazwy sekcji dopasowane do projektu Smartfon (bez „Kursów zawodowych”).
  sekcjeNazwy: {
    A: "A. Rekrutacja",
    B: "B. Umowa i diagnoza",
    C: "C. Obecności i przekazanie sprzętu",
    D: "D. Walidacja, certyfikat, ewaluacja",
    F: "F. Ankiety kompetencji",
    G: "G. Rozliczenia",
  },
};

/**
 * Dane projektu zapisywane poza kodem — w bazie Supabase (tryb prywatny,
 * per użytkownik) albo, gdy baza niedostępna, w localStorage przeglądarki.
 */
export interface ProjektWlasnyZapis {
  id: string;
  nazwa: string;
  skrot: string;
  nabor: string;
  wnioskodawca: string;
  okres: string;
  /** skąd pochodzą dane (np. nazwa wczytanego pliku wniosku) */
  zrodlo: string;
  utworzono: string; // yyyy-mm-dd
  /** sekcje katalogu (A–H) wykryte z analizy wniosku — E6 */
  sekcje?: string[];
  /**
   * Szablon dla projektów przykładowych: "cis" → pełny katalog CIS + przykładowi
   * uczestnicy, "swa" → katalog 6.8. Brak → katalog generyczny z sekcji.
   */
  szablon?: "cis" | "swa";
}

/**
 * Przykładowe projekty zaszczepiane do bazy przy pierwszym logowaniu użytkownika.
 * Są zwykłymi rekordami (z szablonem) — można je edytować i usunąć.
 */
export const SEEDY_PRZYKLADOWE: ProjektWlasnyZapis[] = [
  {
    id: "cis-2026",
    nazwa: specyfikacjaCIS.nazwa,
    skrot: "CIS Świebodzin",
    nabor: specyfikacjaCIS.nabor,
    wnioskodawca: specyfikacjaCIS.wnioskodawca,
    okres: specyfikacjaCIS.okres,
    zrodlo: "Projekt przykładowy (szablon CIS)",
    utworzono: "2026-06-01",
    szablon: "cis",
  },
  {
    id: "swa-6.8",
    nazwa: "Smartfon w Akcji (6.8)",
    skrot: "6.8 Smartfon",
    nabor: specyfikacjaSWA.nabor,
    wnioskodawca: specyfikacjaSWA.wnioskodawca,
    okres: specyfikacjaSWA.okres,
    zrodlo: "Projekt przykładowy (szablon 6.8)",
    utworzono: "2025-01-01",
    szablon: "swa",
  },
];

/** Reprezentatywne dokumenty per sekcja katalogu — baza dla katalogu z analizy wniosku (E6). */
const DOKUMENTY_SEKCJI: Record<
  string,
  { sufiks: string; symbol: string; nazwa: string; rodzaj: string; moment: string; opis: string }[]
> = {
  A: [
    { sufiks: "a-01", symbol: "A-01", nazwa: "Formularz zgłoszeniowy uczestnika", rodzaj: "uczestnik", moment: "rekrutacja", opis: "Dane uczestnika w strukturze SOWA EFS" },
    { sufiks: "a-02", symbol: "A-02", nazwa: "Deklaracja uczestnictwa w projekcie", rodzaj: "uczestnik", moment: "przystąpienie", opis: "Podpisywana w dniu przystąpienia" },
    { sufiks: "a-03", symbol: "A-03", nazwa: "Oświadczenie uczestnika (RODO)", rodzaj: "uczestnik", moment: "rekrutacja", opis: "Klauzula informacyjna EFS+" },
  ],
  B: [
    { sufiks: "b-01", symbol: "B-01", nazwa: "Umowa / kontrakt uczestnictwa", rodzaj: "uczestnik", moment: "przystąpienie", opis: "Warunki udziału we wsparciu" },
    { sufiks: "b-02", symbol: "B-02", nazwa: "Indywidualna ścieżka / plan działania", rodzaj: "uczestnik", moment: "udział", opis: "Diagnoza i plan wsparcia uczestnika" },
  ],
  C: [
    { sufiks: "c-01", symbol: "C-01", nazwa: "Lista obecności na zajęciach", rodzaj: "grupowy", moment: "cyklicznie", opis: "Potwierdzenie udziału w formach wsparcia" },
    { sufiks: "c-05", symbol: "C-05", nazwa: "Harmonogram realizacji wsparcia", rodzaj: "organizacyjny", moment: "cyklicznie", opis: "Plan form wsparcia" },
  ],
  D: [
    { sufiks: "d-01", symbol: "D-01", nazwa: "Karta kursu / szkolenia uczestnika", rodzaj: "uczestnik", moment: "udział", opis: "Skierowanie, ocena, certyfikat" },
  ],
  E: [
    { sufiks: "e-01", symbol: "E-01", nazwa: "Regulamin świadczeń + lista wypłat", rodzaj: "organizacyjny", moment: "cyklicznie", opis: "Stypendia / świadczenia uczestników" },
  ],
  F: [
    { sufiks: "f-01a", symbol: "F-01a", nazwa: "Ankieta kompetencji PRE", rodzaj: "uczestnik", moment: "udział", opis: "Pomiar wejściowy (osobny dokument od POST)" },
    { sufiks: "f-01b", symbol: "F-01b", nazwa: "Ankieta kompetencji POST", rodzaj: "uczestnik", moment: "zakończenie", opis: "Pomiar końcowy; wzrost względem PRE" },
    { sufiks: "f-02", symbol: "F-02", nazwa: "Zaświadczenie o udziale w projekcie", rodzaj: "uczestnik", moment: "zakończenie", opis: "Wydawane po zakończeniu udziału" },
  ],
  G: [
    { sufiks: "g-01", symbol: "G-01", nazwa: "Zakres obowiązków kadry", rodzaj: "kadrowy", moment: "cyklicznie", opis: "Personel merytoryczny" },
    { sufiks: "g-02", symbol: "G-02", nazwa: "Ewidencja czasu pracy", rodzaj: "kadrowy", moment: "cyklicznie", opis: "Rozliczenie zaangażowania" },
  ],
  H: [
    { sufiks: "h-01", symbol: "H-01", nazwa: "Regulamin zarządzania projektem", rodzaj: "organizacyjny", moment: "cyklicznie", opis: "Struktura, obieg dokumentów, monitoring" },
  ],
};

/**
 * Generyczna specyfikacja EFS dla nowego projektu — uniwersalne dokumenty
 * rekrutacyjne wymagane w każdym projekcie EFS+ (pełny katalog formularzy
 * uzupełnia się po analizie wniosku — etap E6).
 */
export function specyfikacjaGeneryczna(
  z: ProjektWlasnyZapis,
): SpecyfikacjaProjektu {
  const p = z.id;
  // Sekcje: wykryte z wniosku (E6) albo domyślny zestaw rekrutacyjny A+F.
  const sekcje =
    z.sekcje && z.sekcje.length > 0
      ? [...new Set(z.sekcje)].sort()
      : ["A", "F"];

  const dokumenty = sekcje.flatMap((litera) =>
    (DOKUMENTY_SEKCJI[litera] ?? []).map((d) => ({
      id: `${p}-${d.sufiks}`,
      symbol: d.symbol,
      nazwa: d.nazwa,
      sekcja: litera as SpecyfikacjaProjektu["dokumenty"][number]["sekcja"],
      rodzaj: d.rodzaj as SpecyfikacjaProjektu["dokumenty"][number]["rodzaj"],
      dotyczy: "wszyscy" as const,
      moment: d.moment as SpecyfikacjaProjektu["dokumenty"][number]["moment"],
      podpisUczestnika: d.rodzaj === "uczestnik" ? "1 podpis" : "bez podpisu",
      generowalny: true,
      opis: d.opis,
    })),
  );

  return {
    id: p,
    nazwa: z.nazwa,
    nabor: z.nabor || "—",
    wnioskodawca: z.wnioskodawca || "—",
    okres: z.okres || "—",
    zrodlo: z.zrodlo,
    dokumenty,
  };
}

const KLUCZ_WLASNE = "cis-app:projekty-wlasne";

export function wczytajProjektyWlasne(): ProjektWlasnyZapis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KLUCZ_WLASNE);
    return raw ? (JSON.parse(raw) as ProjektWlasnyZapis[]) : [];
  } catch {
    return [];
  }
}

export function zapiszProjektyWlasne(lista: ProjektWlasnyZapis[]): void {
  try {
    localStorage.setItem(KLUCZ_WLASNE, JSON.stringify(lista));
  } catch {
    /* limit localStorage */
  }
}

// ── Nadpisania nazwy/skrótu projektów WBUDOWANYCH ───────────────────────────
// Projektów wbudowanych nie można usuwać, ale można zmienić ich wyświetlaną
// nazwę i skrót — przechowujemy to lokalnie (per przeglądarka).

export interface NadpisanieProjektu {
  nazwa?: string;
  skrot?: string;
}

const KLUCZ_NADPISANIA = "cis-app:projekty-nadpisania";

export function wczytajNadpisania(): Record<string, NadpisanieProjektu> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KLUCZ_NADPISANIA);
    return raw ? (JSON.parse(raw) as Record<string, NadpisanieProjektu>) : {};
  } catch {
    return {};
  }
}

export function zapiszNadpisania(
  map: Record<string, NadpisanieProjektu>,
): void {
  try {
    localStorage.setItem(KLUCZ_NADPISANIA, JSON.stringify(map));
  } catch {
    /* limit localStorage */
  }
}

/** Czy dany projekt jest wbudowany (nie da się go usunąć). */
export function projektWbudowany(id: string): boolean {
  return projekty.some((p) => p.id === id);
}

/**
 * Buduje pełny obiekt Projekt z zapisu.
 * Dla projektów przykładowych (szablon) używa pełnego katalogu z kodu
 * (CIS: katalog A–H + przykładowi uczestnicy; 6.8: katalog wstępny).
 * Pozostałe projekty dostają katalog generyczny wyliczony z sekcji.
 */
export function zbudujProjektWlasny(z: ProjektWlasnyZapis): Projekt {
  if (z.szablon === "cis") {
    return {
      id: z.id,
      nazwa: z.nazwa,
      skrot: z.skrot,
      nabor: z.nabor || specyfikacjaCIS.nabor,
      spec: specyfikacjaCIS,
      uczestnicyDomyslni: uczestnicyCIS,
    };
  }
  if (z.szablon === "swa") {
    return {
      id: z.id,
      nazwa: z.nazwa,
      skrot: z.skrot,
      nabor: z.nabor || specyfikacjaSWA.nabor,
      spec: specyfikacjaSWA,
      uczestnicyDomyslni: [],
    };
  }
  return {
    id: z.id,
    nazwa: z.nazwa,
    skrot: z.skrot,
    nabor: z.nabor || "—",
    spec: specyfikacjaGeneryczna(z),
    uczestnicyDomyslni: [],
  };
}

export const projekty: Projekt[] = [
  {
    id: "cis-2026",
    nazwa: "Centrum Integracji Społecznej w Świebodzinie",
    skrot: "CIS Świebodzin",
    nabor: "FELB.06.11-IZ.00-0001/26 (ZIT)",
    spec: specyfikacjaCIS,
    uczestnicyDomyslni: uczestnicyCIS,
  },
  {
    id: "swa-6.8",
    nazwa: "Smartfon w Akcji (6.8)",
    skrot: "6.8 Smartfon",
    nabor: "FELB.06.08-IZ.00-0004/25",
    spec: specyfikacjaSWA,
    uczestnicyDomyslni: [],
  },
];

export const projektDomyslny = projekty[0];
