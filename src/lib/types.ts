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
  rodzajUczestnika?: "Indywidualny" | "Instytucjonalny";
  nazwaInstytucji?: string;
  pesel?: string; // UWAGA RODO: w wersji rozwojowej wyłącznie wartości fikcyjne
  brakPesel?: "Tak" | "Nie";
  technicznyId?: string;
  plec?: "kobieta" | "mężczyzna";
  dataUrodzenia?: string; // RRRR-MM-DD — rozpoznawana z numeru PESEL
  wiek?: number;
  wyksztalcenie?: string; // słownik ISCED
  kraj?: string;
  wojewodztwo?: string;
  powiat?: string;
  gmina?: string;
  miejscowosc?: string;
  ulica?: string;
  nrDomu?: string;
  nrLokalu?: string;
  kodPocztowy?: string;
  degurba?: "1" | "2" | "3";
  telefon?: string;
  email?: string;
  statusRynkuPracy?: string; // słownik SOWA
  wTymStatus?: string;
  dataZakonczeniaUdzialu?: string;
  planowanaDataZakonczeniaEdukacji?: string;
  sytuacjaPoZakonczeniu?: string;
  zakonczenieZgodneZeSciezka?: string;
  zakresWsparcia?: string;
  rodzajWsparcia?: string;
  wTymWsparcia?: string;
  dataRozpoczeciaWsparcia?: string;
  dataZalozeniaDG?: string;
  osobaObcegoPochodzenia?: "Tak" | "Nie";
  obywatelPanstwaTrzeciego?: "Tak" | "Nie";
  mniejszosc?: "Tak" | "Nie";
  bezdomnosc?: "Tak" | "Nie";
  niepelnosprawnosc?: string;
  uwagi?: string;
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
  /** etap ścieżki reintegracji: 0 Diagnoza · 1 IŚR · 2 Realizacja · 3 Zakończenie */
  etapSciezki: 0 | 1 | 2 | 3;
  /** postęp realizacji ścieżki w % (0–100) */
  postepSciezki: number;
  sowa?: DaneSOWA;
}

/** Obecność uczestnika w dniach tygodnia: p obecny · a nieusprawiedliwiony · l L4 · w dzień wolny */
export interface ObecnoscTygodnia {
  uczestnikId: string;
  dni: ("p" | "a" | "l" | "w")[];
}

export type KolorZajec = "green" | "blue" | "amber";

export interface ZajeciaTygodnia {
  godzina: string;
  nazwa: string;
  typ: string;
  kolor: KolorZajec;
  osob: number;
}

export interface DzienHarmonogramu {
  dzien: string;
  data: string;
  dzisiaj?: boolean;
  zajecia: ZajeciaTygodnia[];
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
