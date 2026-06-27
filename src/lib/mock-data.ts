// DANE TESTOWE (w pełni fikcyjne) — do zastąpienia bazą danych (Supabase) w etapie E1.
// UWAGA RODO: struktura odpowiada plikowi Import SOWA, ale wartości są zmyślone.

import type {
  Alert,
  DzienHarmonogramu,
  ObecnoscTygodnia,
  Uczestnik,
  Zajecia,
} from "./types";

const wspolne = {
  obywatelstwo: "polskie",
  kraj: "Polska",
  wojewodztwo: "lubuskie",
  powiat: "świebodziński",
  gmina: "Świebodzin",
  miejscowosc: "Świebodzin",
  degurba: "3" as const,
};

export const etapyNazwy = ["Diagnoza", "IŚR", "Realizacja", "Zakończenie"];

/** Najbliższe zadanie wynikające z etapu ścieżki. */
export const najblizszeZadania = [
  "Opracowanie diagnozy i ścieżki IŚR z doradcą zawodowym",
  "Realizacja zajęć reintegracji zawodowej i społecznej",
  "Monitoring postępów — spotkanie kwartalne z instruktorem",
  "Wydanie zaświadczenia o uczestnictwie w projekcie",
];

export const uczestnicy: Uczestnik[] = [
  { id: "u-001", imie: "Anna", nazwisko: "Testowa", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 92, etapSciezki: 2, postepSciezki: 75,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","d-01","f-01a","f-01b"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 43, wyksztalcenie: "ponadgimnazjalne (ISCED 3)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bezrobotna niezarejestrowana w ewidencji urzędów pracy" } },
  { id: "u-002", imie: "Jan", nazwisko: "Przykładowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 64, etapSciezki: 1, postepSciezki: 40,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-03","c-04"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 51, wyksztalcenie: "podstawowe (ISCED 1)", kodPocztowy: "66-200", statusRynkuPracy: "osoba długotrwale bezrobotna" } },
  { id: "u-003", imie: "Maria", nazwisko: "Wzorcowa", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 88, etapSciezki: 2, postepSciezki: 60,
    posiadaneDokumenty: ["a-01","b-01","b-02","b-04","c-04","d-01","f-01a","f-01b"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 38, wyksztalcenie: "gimnazjalne (ISCED 2)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-004", imie: "Piotr", nazwisko: "Demo", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-06", frekwencja: 79, etapSciezki: 1, postepSciezki: 25,
    posiadaneDokumenty: ["a-01","b-01","b-02","b-04"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 29, wyksztalcenie: "ponadgimnazjalne (ISCED 3)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-005", imie: "Katarzyna", nazwisko: "Próbna", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 95, etapSciezki: 2, postepSciezki: 90,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","d-01","f-01a","f-01b"],
    sowa: { ...wspolne, plec: "kobieta", wiek: 47, wyksztalcenie: "policealne (ISCED 4)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bezrobotna zarejestrowana w ewidencji urzędów pracy" } },
  { id: "u-006", imie: "Tomasz", nazwisko: "Fikcyjny", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 41, etapSciezki: 1, postepSciezki: 50,
    posiadaneDokumenty: ["a-01","a-05"],
    sowa: { ...wspolne, plec: "mężczyzna", wiek: 56, wyksztalcenie: "podstawowe (ISCED 1)", kodPocztowy: "66-200", statusRynkuPracy: "osoba długotrwale bezrobotna" } },
  { id: "u-007", imie: "Ewa", nazwisko: "Przyklad", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "rezerwowy", dataPrzystapienia: "—", frekwencja: 0, etapSciezki: 0, postepSciezki: 0,
    posiadaneDokumenty: [],
    sowa: { ...wspolne, plec: "kobieta", wiek: 33, wyksztalcenie: "gimnazjalne (ISCED 2)", kodPocztowy: "66-200", statusRynkuPracy: "osoba bierna zawodowo" } },
  { id: "u-008", imie: "Marek", nazwisko: "Testowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 85, etapSciezki: 2, postepSciezki: 70,
    posiadaneDokumenty: ["a-01","a-05","b-01","b-02","b-03","c-04","f-01a","f-01b"],
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

/** Obecności aktywnych uczestników w bieżącym tygodniu (Pon–Pt). */
export const obecnosciTygodnia: ObecnoscTygodnia[] = [
  { uczestnikId: "u-001", dni: ["p", "p", "p", "l", "p"] },
  { uczestnikId: "u-002", dni: ["p", "a", "p", "p", "w"] },
  { uczestnikId: "u-003", dni: ["p", "p", "l", "p", "p"] },
  { uczestnikId: "u-004", dni: ["p", "p", "p", "p", "p"] },
  { uczestnikId: "u-005", dni: ["p", "p", "p", "p", "p"] },
  { uczestnikId: "u-006", dni: ["a", "p", "w", "a", "p"] },
  { uczestnikId: "u-008", dni: ["p", "p", "p", "p", "l"] },
];

export const tydzienEtykieta = "Tydzień 8–12 czerwca 2026";

export const dniTygodnia = ["Pon", "Wt", "Śr", "Czw", "Pt"];

/** Harmonogram bieżącego tygodnia — plan zajęć i warsztatów. */
export const harmonogramTygodnia: DzienHarmonogramu[] = [
  {
    dzien: "Poniedziałek", data: "8 cze",
    zajecia: [
      { godzina: "08:00", nazwa: "Prace porządkowe", typ: "Reintegracja zawod.", kolor: "green", osob: 8 },
      { godzina: "12:00", nazwa: "Doradztwo zawodowe", typ: "Indywidualne", kolor: "blue", osob: 4 },
    ],
  },
  {
    dzien: "Wtorek", data: "9 cze",
    zajecia: [
      { godzina: "09:00", nazwa: "Warsztat kompetencji", typ: "Grupowe", kolor: "amber", osob: 7 },
      { godzina: "13:00", nazwa: "Grupa wsparcia", typ: "Reintegracja społ.", kolor: "green", osob: 6 },
    ],
  },
  {
    dzien: "Środa", data: "10 cze",
    zajecia: [
      { godzina: "08:00", nazwa: "Prace porządkowe", typ: "Reintegracja zawod.", kolor: "green", osob: 8 },
      { godzina: "11:00", nazwa: "Spotkanie z psychologiem", typ: "Indywidualne", kolor: "blue", osob: 3 },
    ],
  },
  {
    dzien: "Czwartek", data: "11 cze", dzisiaj: true,
    zajecia: [
      { godzina: "09:00", nazwa: "Warsztat kompetencji społecznych", typ: "Warsztat", kolor: "amber", osob: 7 },
      { godzina: "12:30", nazwa: "Konsultacje indywidualne", typ: "Indywidualne", kolor: "blue", osob: 4 },
    ],
  },
  {
    dzien: "Piątek", data: "12 cze",
    zajecia: [
      { godzina: "10:00", nazwa: "Trening pracy", typ: "Reintegracja zawod.", kolor: "green", osob: 8 },
      { godzina: "12:00", nazwa: "Podsumowanie tygodnia", typ: "Grupowe", kolor: "green", osob: 7 },
    ],
  },
];

/** Wpisy „Ostatnia aktywność” na pulpicie. */
export const ostatniaAktywnosc = [
  { kto: "Katarzyna Próbna", co: " — komplet dokumentów w teczce", kiedy: "2 godz. temu", ikona: "check_circle", odcien: "green" as const },
  { kto: "Tomasz Fikcyjny", co: " — frekwencja 41% (próg ryzyka: 50%)", kiedy: "dziś, 9:14", ikona: "error", odcien: "amber" as const },
  { kto: "Ewa Przyklad", co: " — na liście rezerwowej, brak dokumentów", kiedy: "wczoraj", ikona: "person_add", odcien: "blue" as const },
  { kto: "Grupa A", co: " — przegląd IŚR do 30.06.2026", kiedy: "2 dni temu", ikona: "flag", odcien: "teal" as const },
];
