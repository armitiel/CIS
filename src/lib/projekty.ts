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
}

/**
 * Generyczna specyfikacja EFS dla nowego projektu — uniwersalne dokumenty
 * rekrutacyjne wymagane w każdym projekcie EFS+ (pełny katalog formularzy
 * uzupełnia się po analizie wniosku — etap E6).
 */
export function specyfikacjaGeneryczna(
  z: ProjektWlasnyZapis,
): SpecyfikacjaProjektu {
  const p = z.id;
  return {
    id: p,
    nazwa: z.nazwa,
    nabor: z.nabor || "—",
    wnioskodawca: z.wnioskodawca || "—",
    okres: z.okres || "—",
    zrodlo: z.zrodlo,
    dokumenty: [
      {
        id: `${p}-a-01`, symbol: "A-01", nazwa: "Formularz zgłoszeniowy uczestnika",
        sekcja: "A", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "rekrutacja",
        podpisUczestnika: "1 podpis", generowalny: true,
        opis: "Dane uczestnika w strukturze SOWA EFS",
      },
      {
        id: `${p}-a-02`, symbol: "A-02", nazwa: "Deklaracja uczestnictwa w projekcie",
        sekcja: "A", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "przystąpienie",
        podpisUczestnika: "1 podpis", generowalny: true,
        opis: "Podpisywana w dniu przystąpienia do projektu",
      },
      {
        id: `${p}-a-03`, symbol: "A-03", nazwa: "Oświadczenie uczestnika (RODO)",
        sekcja: "A", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "rekrutacja",
        podpisUczestnika: "1 podpis", generowalny: true,
        opis: "Klauzula informacyjna programu regionalnego / EFS+",
      },
      {
        id: `${p}-f-01`, symbol: "F-01", nazwa: "Zaświadczenie o udziale w projekcie",
        sekcja: "F", rodzaj: "uczestnik", dotyczy: "wszyscy", moment: "zakończenie",
        podpisUczestnika: "bez podpisu uczestnika", generowalny: true,
        opis: "Wydawane po zakończeniu udziału",
      },
    ],
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
