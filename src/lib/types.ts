// Typy domenowe aplikacji CIS — odwzorowanie modelu danych z koncepcji (rozdz. 5)

export type KategoriaUczestnika = "bezrobotny" | "bierny";
export type StatusUdzialu = "aktywny" | "rezerwowy" | "zakończył" | "przerwał";
export type TypSciezki = "IPZS" | "IPR";
export type StatusObecnosci =
  | "obecny"
  | "nieobecny_uspr"
  | "nieobecny_nieuspr"
  | "zwolnienie";

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
  brakujaceDokumenty: string[];
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
