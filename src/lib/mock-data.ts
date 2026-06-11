// DANE TESTOWE (w pełni fikcyjne) — do zastąpienia bazą danych (Supabase) w etapie E1.
// UWAGA RODO: struktura odpowiada plikowi Import SOWA, ale wartości są zmyślone.

import type { Uczestnik, Zajecia, Alert } from "./types";

const wspolne = {
  obywatelstwo: "polskie",
  kraj: "Polska",
  wojewodztwo: "lubuskie",
  powiat: "świebodziński",
  gmina: "Świebodzin",
  miejscowosc: "Świebodzin",
  degurba: "3" as const,
};

export const uczestnicy: Uczestnik[] = [
  { id: "u-001", imie: "Anna", nazwisko: "Testowa", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 92,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","d-01","f-01"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 43, wyksztalcenie: "ponadgimnazjalne (ISCED 3)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bezrobotna niezarejestrowana w ewidencji urzędów pracy" } },
  { id: "u-002", imie: "Jan", nazwisko: "Przykładowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 64,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-03","c-04"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 51, wyksztalcenie: "podstawowe (ISCED 1)", kodPocztowy: "66-200", statusRynkuPracy: "osoba długotrwale bezrobotna" } },
  { id: "u-003", imie: "Maria", nazwisko: "Wzorcowa", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 88,
    posiadaneDokumenty: ["a-01","b-01","b-02","b-04","c-04","d-01","f-01"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 38, wyksztalcenie: "gimnazjalne (ISCED 2)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-004", imie: "Piotr", nazwisko: "Demo", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-06", frekwencja: 79,
    posiadaneDokumenty: ["a-01","b-01","b-02","b-04"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 29, wyksztalcenie: "ponadgimnazjalne (ISCED 3)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-005", imie: "Katarzyna", nazwisko: "Próbna", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 95,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","d-01","f-01"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 47, wyksztalcenie: "policealne (ISCED 4)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bezrobotna zarejestrowana w ewidencji urzędów pracy" } },
  { id: "u-006", imie: "Tomasz", nazwisko: "Fikcyjny", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 41,
    posiadaneDokumenty: ["a-01","a-05"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 56, wyksztalcenie: "podstawowe (ISCED 1)", kodPocztowy: "66-200", statusRynkuPracy: "osoba długotrwale bezrobotna" } },
  { id: "u-007", imie: "Ewa", nazwisko: "Przyklad", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "rezerwowy", dataPrzystapienia: "—", frekwencja: 0,
    posiadaneDokumenty: [],
    sowa: { ...wspolne, plec: "kobieta", wiek: 33, wyksztalcenie: "gimnazjalne (ISCED 2)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-008", imie: "Marek", nazwisko: "Testowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 85,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","f-01"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 40, wyksztalcenie: "ponadgimnazjalne (ISCED 3)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bezrobotna zarejestrowana w ewidencji urzędów pracy" } },
];

export const dzisiejszeZajecia: Zajecia[] = [
  { id: "z-1", nazwa: "Warsztat kompetencji społecznych", prowadzacy: "Trener", grupa: "A", godzina: "09:00–12:00", sala: "Sala 1" },
  { id: "z-2", nazwa: "Zajęcia praktyczne — instruktor zawodu", prowadzacy: "Instruktor I", grupa: "C", godzina: "09:00–13:00", sala: "Warsztat" },
  { id: "z-3", nazwa: "Konsultacje indywidualne", prowadzacy: "Psycholog", grupa: "wg zapisów", godzina: "12:30–15:30", sala: "Gabinet" },
];

export const alerty: Alert[] = [
  { id: "a-1", typ: "frekwencja", tresc: "Tomasz Fikcyjny — frekwencja 41% (próg ryzyka: 50%)", uczestnikId: "u-006" },
  { id: "a-2", typ: "dokumenty", tresc: "4 uczestników ma niekompletne teczki dokumentów" },
  { id: "a-3", typ: "sciezka", tresc: "Przegląd IŚR dla grupy A — termin do 30.06.2026" },
];

export const limity = {
  bezrobotni: { zajete: 5, limit: 54 },
  bierni: { zajete: 3, limit: 47 },
};
