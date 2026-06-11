// Specyfikacja dokumentacyjna projektu CIS Świebodzin (FELB.06.11-IZ.00-0001/26)
// Źródło: katalog formularzy projektowych A–H (Formularze_projektowe, stan 10.06.2026)
// oraz "Analiza optymalizacji formularzy CIS 6.11" v3 (15 konsolidacji, zasady podpisów).
// Docelowo (etap E6) specyfikacje będą tworzone przez analizę AI wczytanego wniosku.

import type { KategoriaUczestnika, Uczestnik } from "./types";

export type Sekcja = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type RodzajDokumentu =
  | "uczestnik" // dokument indywidualny w teczce uczestnika
  | "grupowy" // listy zbiorcze (obecność, wydania, wyjazdy)
  | "kadrowy" // prowadzi i podpisuje wyłącznie kadra
  | "organizacyjny"; // regulaminy, porozumienia, wzory
export type MomentDokumentu =
  | "rekrutacja"
  | "przystąpienie"
  | "udział"
  | "zakończenie"
  | "ad hoc"
  | "cyklicznie";
export type DotyczyKogo = "wszyscy" | KategoriaUczestnika;

export interface WymaganyDokument {
  id: string; // symbol, np. "a-01"
  symbol: string; // np. "CIS_A-01"
  nazwa: string;
  sekcja: Sekcja;
  rodzaj: RodzajDokumentu;
  dotyczy: DotyczyKogo;
  moment: MomentDokumentu;
  podpisUczestnika: string; // zasada wg analizy optymalizacji
  generowalny: boolean;
  opis: string;
}

export interface SpecyfikacjaProjektu {
  id: string;
  nazwa: string;
  nabor: string;
  wnioskodawca: string;
  okres: string;
  zrodlo: string;
  dokumenty: WymaganyDokument[];
}

export const sekcjeNazwy: Record<Sekcja, string> = {
  A: "A. Rekrutacja",
  B: "B. Ścieżka reintegracji",
  C: "C. Obecności i wsparcie",
  D: "D. Kursy zawodowe",
  E: "E. Świadczenia i wydania",
  F: "F. Ankiety i wskaźniki",
  G: "G. Kadra",
  H: "H. Zarządzanie",
};

const D = (
  symbol: string,
  nazwa: string,
  sekcja: Sekcja,
  rodzaj: RodzajDokumentu,
  dotyczy: DotyczyKogo,
  moment: MomentDokumentu,
  podpisUczestnika: string,
  generowalny: boolean,
  opis: string,
): WymaganyDokument => ({
  id: symbol.replace("CIS_", "").toLowerCase(),
  symbol,
  nazwa,
  sekcja,
  rodzaj,
  dotyczy,
  moment,
  podpisUczestnika,
  generowalny,
  opis,
});

export const specyfikacjaCIS: SpecyfikacjaProjektu = {
  id: "cis-2026",
  nazwa: "Centrum Integracji Społecznej w Świebodzinie",
  nabor: "FELB.06.11-IZ.00-0001/26 (ZIT)",
  wnioskodawca: "Stowarzyszenie na Rzecz Edukacji „Pomost”",
  okres: "01.06.2026 – 31.12.2027",
  zrodlo:
    "Katalog formularzy A–H (10.06.2026) + Analiza optymalizacji formularzy v3",
  dokumenty: [
    // ===== A. Rekrutacja =====
    D("CIS_A-01", "Pakiet zgłoszeniowy uczestnika", "A", "uczestnik", "wszyscy", "rekrutacja",
      "1 podpis na końcu pakietu (oświadczenia, RODO, zgody — zasada „jeden pakiet — jeden podpis”)", true,
      "Formularz danych (słowniki SOWA) + deklaracja + oświadczenia kwalifikowalności + klauzula RODO + przesłanki premiujące"),
    D("CIS_A-02", "Regulamin rekrutacji i uczestnictwa", "A", "organizacyjny", "wszyscy", "rekrutacja",
      "bez podpisu", true, "Dokument projektowy — publikowany, nie podpisywany przez uczestników"),
    D("CIS_A-03", "Karta oceny kandydata", "A", "kadrowy", "wszyscy", "rekrutacja",
      "bez podpisu kandydata", true, "Ocena formalna 0/1 + ocena punktowa (wagi 30/50/20) + wynik rozmowy w protokole"),
    D("CIS_A-04", "Lista podstawowa i rezerwowa", "A", "kadrowy", "wszyscy", "rekrutacja",
      "bez podpisu", true, "Sporządza komisja rekrutacyjna"),
    D("CIS_A-05", "Skierowanie / wniosek o przyjęcie do CIS", "A", "uczestnik", "bezrobotny", "rekrutacja",
      "wystawia OPS/PUP — odrębny wymóg ustawowy", false,
      "Ustawa o zatrudnieniu socjalnym — nie podlega łączeniu z pakietem zgłoszeniowym"),
    D("CIS_A-06", "Protokół posiedzenia komisji + lista rankingowa", "A", "kadrowy", "wszyscy", "rekrutacja",
      "bez podpisu", true, "Protokół komisji rekrutacyjnej"),

    // ===== B. Ścieżka reintegracji =====
    D("CIS_B-01", "Umowa uczestnictwa w projekcie", "B", "uczestnik", "wszyscy", "przystąpienie",
      "1 podpis (+ jednorazowo nr rachunku do wypłat przelewem)", true,
      "Zawiera zobowiązanie do wypełniania ankiet (§3) i oświadczenie o numerze rachunku"),
    D("CIS_B-02", "Arkusz diagnozy kompleksowej", "B", "uczestnik", "wszyscy", "udział",
      "podpis przy diagnozie (dowód usługi — poz. 1.1)", true, "Podstawa opracowania IŚR (Zadanie 1)"),
    D("CIS_B-03", "Indywidualny Program Zatrudnienia Socjalnego (IPZS)", "B", "uczestnik", "bezrobotny", "udział",
      "podpis uczestnika (wymóg ustawy, art. 12)", true,
      "Odrębny dokument ustawowy — nie podlega łączeniu; zmiany aneksem"),
    D("CIS_B-04", "Indywidualny Program Rozwoju (IPR)", "B", "uczestnik", "bierny", "udział",
      "podpis uczestnika", true, "Dla osób biernych zawodowo; zmiany aneksem"),
    D("CIS_B-05", "Karta monitoringu IŚR z opinią końcową", "B", "kadrowy", "wszyscy", "udział",
      "bez podpisu uczestnika — podpisuje pracownik socjalny/koordynator IŚR", true,
      "Opinia o poprawie sytuacji społecznej = źródło wskaźnika rezultatu (K3)"),
    D("CIS_B-06", "Wniosek i protokół racjonalnych usprawnień", "B", "uczestnik", "wszyscy", "ad hoc",
      "dotyczy wyłącznie OzN — ad hoc", true, "Źródło pomiaru wskaźnika (wniosek s. 9)"),

    // ===== C. Obecności i wsparcie =====
    D("CIS_C-01", "Dzienna lista obecności ze świadczeniami", "C", "grupowy", "wszyscy", "cyklicznie",
      "1 podpis dziennie (obecność + wyżywienie + transport na jednej liście — K4)", true,
      "Jedna lista zamiast trzech ewidencji; pola wyżywienie/transport odhacza kadra"),
    D("CIS_C-02", "Miesięczna indywidualna karta obecności", "C", "kadrowy", "bezrobotny", "cyklicznie",
      "bez podpisu uczestnika — sporządza kadra z list dziennych", true,
      "Wymóg wniosku (s. 29): podstawa wypłaty świadczenia integracyjnego"),
    D("CIS_C-03", "Dziennik zajęć z programem", "C", "kadrowy", "wszyscy", "cyklicznie",
      "kadra (program = karta tytułowa — K5)", true, "Jeden zeszyt na grupę/formę wsparcia"),
    D("CIS_C-04", "Karta wsparcia indywidualnego (uniwersalna)", "C", "uczestnik", "wszyscy", "udział",
      "1 podpis na spotkanie — dowód wykonania usługi (K6)", true,
      "Jeden wzór: psycholog / terapeuta / doradca (IPD) / pośrednik pracy"),
    D("CIS_C-05", "Harmonogram realizacji wsparcia", "C", "kadrowy", "wszyscy", "cyklicznie",
      "kadra", true, "Harmonogram grup i form wsparcia"),
    D("CIS_C-06", "Broszura informacyjna dla uczestników", "C", "organizacyjny", "wszyscy", "przystąpienie",
      "bez podpisów", true, "4 strony A4 — prawa i obowiązki, świadczenia, kontakty"),

    // ===== D. Kursy zawodowe =====
    D("CIS_D-01", "Karta kursu zawodowego uczestnika", "D", "uczestnik", "wszyscy", "udział",
      "2 podpisy na kurs: skierowanie + odbiór materiałów/odzieży/ŚOI (K7)", true,
      "Skierowanie + odbiór + 4 etapy oceny kompetencji + nr certyfikatu w jednym dokumencie"),

    // ===== E. Świadczenia i wydania =====
    D("CIS_E-01", "Regulamin świadczeń i premii + wzór listy wypłat", "E", "organizacyjny", "bezrobotny", "cyklicznie",
      "0 podpisów przy wypłacie przelewem (K11 — wyciąg bankowy dowodem)", true,
      "Największa oszczędność podpisów: przelew zamiast listy gotówkowej"),
    D("CIS_E-02", "Zbiorcza lista wydań rzeczowych", "E", "grupowy", "wszyscy", "cyklicznie",
      "1 podpis na wydanie (cała grupa na jednym arkuszu — K12)", true,
      "Środki higieny i inne wydania — łączone, np. raz w miesiącu"),
    D("CIS_E-03", "Wniosek o opiekę nad osobą zależną", "E", "uczestnik", "wszyscy", "ad hoc",
      "1 podpis na cykl (K13)", true,
      "Dotyczy uczestników korzystających z opieki; karta pracy opiekuna = wzór G-02"),
    D("CIS_E-04", "Zgłoszenie zbiorcze na wyjazd integracyjny + program", "E", "grupowy", "wszyscy", "ad hoc",
      "1 podpis na wyjazd (zgoda + oświadczenie zdrowotne — K14)", true,
      "Obecność na wyjeździe na standardowej liście dziennej C-01"),
    D("CIS_E-05", "Protokół przekazania / OT samochodu brygadowego", "E", "kadrowy", "wszyscy", "ad hoc",
      "kadra/księgowość", true, "Dokument majątkowy"),

    // ===== F. Ankiety i wskaźniki =====
    D("CIS_F-01", "Ankieta kompetencji PRE/POST", "F", "uczestnik", "wszyscy", "udział",
      "bez podpisu uczestnika — kod uczestnika + podpis prowadzącego pomiar (K10)", true,
      "Jeden wzór, dwa pomiary; nie jest źródłem wskaźnika"),
    D("CIS_F-02", "Ankieta końcowa z oświadczeniem o sytuacji", "F", "uczestnik", "wszyscy", "zakończenie",
      "1 podpis — oświadczenie jest źródłem wskaźnika EECR01/04 (K9)", true,
      "Wypełniana do 4 tygodni od zakończenia udziału"),
    D("CIS_F-03", "Skoroszyt monitoringu wskaźników (xlsx)", "F", "kadrowy", "wszyscy", "cyklicznie",
      "kadra (K8)", true, "3 arkusze: certyfikaty, zatrudnienie po projekcie, matryca wskaźników"),

    // ===== G. Kadra =====
    D("CIS_G-01", "Zakresy obowiązków kadry merytorycznej", "G", "kadrowy", "wszyscy", "cyklicznie",
      "kadra", true, "Umowy + zakresy obowiązków"),
    D("CIS_G-02", "Ewidencja czasu pracy (uniwersalna)", "G", "kadrowy", "wszyscy", "cyklicznie",
      "kadra (K15) — jeden wzór: personel + opiekun osób zależnych", true, "Karty czasu pracy"),
    D("CIS_G-03", "Protokół odbioru usług zewnętrznych (uniwersalny)", "G", "kadrowy", "wszyscy", "cyklicznie",
      "wykonawca + zamawiający — źródło pomiaru wskaźnika (s. 7)", true,
      "Diagnoza IŚR, psycholog, terapeuta — jeden wzór"),

    // ===== H. Zarządzanie =====
    D("CIS_H-01", "Regulamin zarządzania projektem", "H", "organizacyjny", "wszyscy", "cyklicznie",
      "kadra zarządzająca", true, "Struktura, obiegi, odpowiedzialności"),
    D("CIS_H-07", "Porozumienie JST — świadczenia integracyjne", "H", "organizacyjny", "bezrobotny", "cyklicznie",
      "strony porozumienia", true,
      "Finansowanie świadczeń integracyjnych z dotacji JST = wkład własny 368 609,57 zł"),
  ],
};

/** Dokumenty indywidualne (teczka uczestnika), bez pozycji „ad hoc”. */
export function wymaganeDokumenty(u: Uczestnik): WymaganyDokument[] {
  return specyfikacjaCIS.dokumenty.filter((d) => {
    if (d.rodzaj !== "uczestnik") return false;
    if (d.moment === "ad hoc") return false;
    if (d.dotyczy !== "wszyscy" && d.dotyczy !== u.kategoria) return false;
    if (d.moment === "zakończenie" && u.status !== "zakończył") return false;
    if (
      (d.moment === "udział" || d.moment === "przystąpienie") &&
      u.status === "rezerwowy"
    )
      return false;
    return true;
  });
}

/** Dokumenty „ad hoc” możliwe dla uczestnika (OzN, opieka, wyjazdy). */
export function dokumentyAdHoc(u: Uczestnik): WymaganyDokument[] {
  return specyfikacjaCIS.dokumenty.filter(
    (d) =>
      d.rodzaj === "uczestnik" &&
      d.moment === "ad hoc" &&
      (d.dotyczy === "wszyscy" || d.dotyczy === u.kategoria),
  );
}

/** Braki w teczce uczestnika względem specyfikacji. */
export function brakiWTeczce(u: Uczestnik): WymaganyDokument[] {
  return wymaganeDokumenty(u).filter(
    (d) => !u.posiadaneDokumenty.includes(d.id),
  );
}
