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
  zrodlo: "Specyfikacja wstępna — do uzupełnienia (wczytaj wniosek / dodaj formularze)",
  dokumenty: [
    {
      id: "swa-a-01", symbol: "SWA_A-01", nazwa: "Formularz zgłoszeniowy uczestnika (pakiet)",
      sekcja: "A", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "rekrutacja",
      podpisUczestnika: "1 podpis na pakiecie", generowalny: true,
      opis: "Dane uczestnika w strukturze SOWA + oświadczenia i RODO (synchronizowane z plikiem Import)",
    },
    {
      id: "swa-b-01", symbol: "SWA_B-01", nazwa: "Umowa uczestnictwa / deklaracja",
      sekcja: "B", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "przystąpienie",
      podpisUczestnika: "1 podpis", generowalny: true,
      opis: "Warunki udziału w projekcie",
    },
    {
      id: "swa-c-01", symbol: "SWA_C-01", nazwa: "Lista obecności na zajęciach",
      sekcja: "C", rodzaj: "grupowy", dotyczy: "wszyscy", moment: "cyklicznie",
      podpisUczestnika: "1 podpis na zajęcia", generowalny: true,
      opis: "Listy grupowe z zajęć (cykle szkoleniowe)",
    },
    {
      id: "swa-f-01", symbol: "SWA_F-01", nazwa: "Zaświadczenie o ukończeniu wsparcia",
      sekcja: "F", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "zakończenie",
      podpisUczestnika: "bez podpisu uczestnika", generowalny: true,
      opis: "Potwierdzenie ukończenia udziału",
    },
  ],
};

/** Dane projektu własnego zapisywane w przeglądarce (localStorage). */
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
}

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
    { sufiks: "f-01", symbol: "F-01", nazwa: "Ankieta / pomiar wskaźników", rodzaj: "uczestnik", moment: "udział", opis: "PRE/POST, wskaźniki rezultatu" },
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

/** Buduje pełny obiekt Projekt z zapisu własnego. */
export function zbudujProjektWlasny(z: ProjektWlasnyZapis): Projekt {
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
