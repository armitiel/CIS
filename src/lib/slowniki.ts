// Słowniki SOWA EFS i formaty danych wpisowych — jedno źródło prawdy dla:
// formularzy aplikacji (E1), importu CSV/Excel, interaktywnych PDF i walidacji.
// Wartości zgodne z wymogami importu SOWA (uwaga: em-dash „–” w ISCED, nie dywiz).

export const SLOWNIK_PLEC = ["Kobieta", "Mężczyzna"] as const;

export const SLOWNIK_WYKSZTALCENIE = [
  "Brak lub niepełne podstawowe (ISCED 0)",
  "Niższe niż podstawowe (ISCED 0–2)",
  "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)",
  "Ponadgimnazjalne (ISCED 3) lub policealne (ISCED 4)",
  "Wyższe (ISCED 5–8)",
] as const;

/** 16 województw RP — pisownia małymi literami, zgodnie z importem SOWA. */
export const SLOWNIK_WOJEWODZTWA = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export const SLOWNIK_STATUS_RYNKU_PRACY = [
  "Osoba bezrobotna",
  "Osoba bierna zawodowo",
  "Osoba pracująca",
] as const;

/** Pole "w tym" — wartości zależne od statusu na rynku pracy. */
export const SLOWNIK_W_TYM: Record<string, string[]> = {
  "Osoba bezrobotna": ["Inne"],
  "Osoba bierna zawodowo": [
    "Osoba nieuczestnicząca w kształceniu lub szkoleniu",
    "",
  ],
  "Osoba pracująca": [""],
};

export const SLOWNIK_DEGURBA = [
  "1 — miasta (obszar gęsto zaludniony)",
  "2 — małe miasta i przedmieścia",
  "3 — obszar wiejski",
] as const;

export const SLOWNIK_TAK_NIE = ["Tak", "Nie"] as const;

/** Formaty pól wpisowych (do walidacji i podpowiedzi w formularzach). */
export const FORMATY = {
  pesel: { wzor: /^\d{11}$/, opis: "11 cyfr, z poprawną sumą kontrolną" },
  kodPocztowy: { wzor: /^\d{2}-\d{3}$/, opis: "format 00-000 (z myślnikiem)" },
  data: { wzor: /^\d{4}-\d{2}-\d{2}$/, opis: "format RRRR-MM-DD" },
  telefon: { wzor: /^[\d +-]{7,15}$/, opis: "7–15 cyfr" },
  email: {
    wzor: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    opis: "bez polskich znaków diakrytycznych",
  },
} as const;

export interface WynikWalidacjiPesel {
  poprawny: boolean;
  blad?: string;
  plec?: "Kobieta" | "Mężczyzna";
  dataUrodzenia?: string; // RRRR-MM-DD
}

/** Walidacja PESEL: format, suma kontrolna, data urodzenia, płeć. */
export function walidujPesel(pesel: string): WynikWalidacjiPesel {
  const p = pesel.trim();
  if (!FORMATY.pesel.wzor.test(p))
    return { poprawny: false, blad: "PESEL musi mieć dokładnie 11 cyfr" };

  const wagi = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const suma = wagi.reduce((s, w, i) => s + w * Number(p[i]), 0);
  const kontrolna = (10 - (suma % 10)) % 10;
  if (kontrolna !== Number(p[10]))
    return { poprawny: false, blad: "Niepoprawna suma kontrolna PESEL" };

  let rok = Number(p.slice(0, 2));
  let miesiac = Number(p.slice(2, 4));
  if (miesiac > 80) {
    rok += 1800;
    miesiac -= 80;
  } else if (miesiac > 60) {
    rok += 2200;
    miesiac -= 60;
  } else if (miesiac > 40) {
    rok += 2100;
    miesiac -= 40;
  } else if (miesiac > 20) {
    rok += 2000;
    miesiac -= 20;
  } else {
    rok += 1900;
  }
  const dzien = Number(p.slice(4, 6));
  const data = new Date(rok, miesiac - 1, dzien);
  if (
    data.getFullYear() !== rok ||
    data.getMonth() !== miesiac - 1 ||
    data.getDate() !== dzien
  )
    return { poprawny: false, blad: "PESEL zawiera nieistniejącą datę urodzenia" };

  return {
    poprawny: true,
    plec: Number(p[9]) % 2 === 1 ? "Mężczyzna" : "Kobieta",
    dataUrodzenia: `${rok}-${String(miesiac).padStart(2, "0")}-${String(dzien).padStart(2, "0")}`,
  };
}

/** Wiek w chwili wskazanej daty (np. przystąpienia do projektu). */
export function wiekWDniu(dataUrodzenia: string, dzien: string): number | null {
  const ur = new Date(dataUrodzenia);
  const d = new Date(dzien);
  if (isNaN(ur.getTime()) || isNaN(d.getTime())) return null;
  let wiek = d.getFullYear() - ur.getFullYear();
  const m = d.getMonth() - ur.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < ur.getDate())) wiek -= 1;
  return wiek;
}
