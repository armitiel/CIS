// Typy domenowe aplikacji CIS — model danych z koncepcji (rozdz. 5)
// rozszerzony o strukturę SOWA EFS (wg kolumn pliku Import uczestników).

export type KategoriaUczestnika = "bezrobotny" | "bierny";
export type StatusUdzialu = "aktywny" | "rezerwowy" | "zakończył" | "przerwał";
export type TypSciezki = "IPZS" | "IPR";
export type StatusObecnosci =
  | "obecny"
  | "nieobecny_uspr"
  | "nieobecny_nieuspr"
  | "zwolnienie";

/** Dane uczestnika w strukturze SOWA EFS (kolumny pliku Import). */
export interface DaneSOWA {
  obywatelstwo?: string;
  pesel?: string; // UWAGA RODO: w wersji rozwojowej wyłącznie wartości fikcyjne
  plec?: "kobieta" | "mężczyzna";
  wiek?: number;
  wyksztalcenie?: string; // słownik ISCED
  kraj?: string;
  wojewodztwo?: string;
  powiat?: string;
  gmina?: string;
  miejscowosc?: string;
  kodPocztowy?: string;
  degurba?: "1" | "2" | "3";
  telefon?: string;
  email?: string;
  statusRynkuPracy?: string; // słownik SOWA
}

export interface Uczestnik {
  id: string;
  imie: string;
  nazwisko: string;
  kategoria: KategoriaUczestnika;
  sciezka: TypSciezki;
  cykl: 1 | 2;
  grupa: string;
  status: StatusUdzialu;
  dataPrzystapienia: string; // ISO
  frekwencja: number; // %
  /** identyfikatory dokumentów w teczce — symbole z projekt-spec (np. "a-01") */
  posiadaneDokumenty: string[];
  sowa?: DaneSOWA;
}

export interface Zajecia {
  id: string;
  nazwa: string;
  prowadzacy: string;
  grupa: string;
  godzina: string;
  sala: string;
}

export interface Alert {
  id: string;
  typ: "frekwencja" | "dokumenty" | "sciezka";
  tresc: string;
  uczestnikId?: string;
}
