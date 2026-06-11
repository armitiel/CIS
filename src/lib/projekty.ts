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
