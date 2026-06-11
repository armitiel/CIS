// Walidacja danych uczestników pod import do SOWA EFS (Generator Wniosków).
// Reguły odwzorowane z praktyki naprawiania raportów „Informacja_zwrotna”:
// PESEL (suma kontrolna + zgodność płci), słowniki (obywatelstwo, wykształcenie
// ISCED z em-dash, status na rynku pracy + „w tym”), formaty dat i kodu pocztowego,
// pola wymagane (telefon, e-mail bez polskich znaków).

import type { Uczestnik } from "./types";

export type PoziomProblemu = "blad" | "ostrzezenie";

export interface ProblemWalidacji {
  uczestnikId: string;
  poziom: PoziomProblemu;
  pole: string;
  komunikat: string;
}

/** Dokładne wartości słownika „Obywatelstwo” akceptowane przez SOWA. */
export const SLOWNIK_OBYWATELSTWO = [
  "Obywatelstwo polskie",
  "Brak polskiego obywatelstwa lub UE – obywatel kraju spoza UE/ bezpaństwowiec",
];

/** Wartości słownika „Wykształcenie” (em-dash –, nie dywiz -). */
export const SLOWNIK_WYKSZTALCENIE = [
  "Brak lub niepełne podstawowe (ISCED 0)",
  "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)",
  "Niższe niż podstawowe (ISCED 0–2)",
  "Ponadgimnazjalne (ISCED 3) lub policealne (ISCED 4)",
  "Wyższe (ISCED 5–8)",
];

export const SLOWNIK_STATUS = [
  "Osoba bezrobotna",
  "Osoba bierna zawodowo",
  "Osoba pracująca",
];

/** Walidacja sumy kontrolnej PESEL; zwraca też płeć wynikającą z numeru. */
export function walidujPesel(pesel: string): {
  poprawny: boolean;
  plec?: "kobieta" | "mężczyzna";
} {
  if (!/^\d{11}$/.test(pesel)) return { poprawny: false };
  const wagi = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const suma = wagi.reduce(
    (s, w, i) => s + w * Number(pesel[i]),
    0,
  );
  const kontrolna = (10 - (suma % 10)) % 10;
  if (kontrolna !== Number(pesel[10])) return { poprawny: false };
  const plec = Number(pesel[9]) % 2 === 0 ? "kobieta" : "mężczyzna";
  return { poprawny: true, plec };
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_KOD = /^\d{2}-\d{3}$/;
const RE_PL_ZNAKI = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/** Mapowanie skróconych zapisów wykształcenia (dane robocze) na słownik SOWA. */
export function mapujWyksztalcenie(w: string): string | null {
  const n = w.toLowerCase();
  if (SLOWNIK_WYKSZTALCENIE.includes(w)) return w;
  if (n.includes("isced 0") && !n.includes("0–2") && !n.includes("0-2"))
    return "Brak lub niepełne podstawowe (ISCED 0)";
  if (n.includes("isced 1") || n.includes("isced 2") || n.includes("gimnaz"))
    return "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)";
  if (
    n.includes("isced 3") ||
    n.includes("isced 4") ||
    n.includes("ponadgimnaz") ||
    n.includes("policealne")
  )
    return "Ponadgimnazjalne (ISCED 3) lub policealne (ISCED 4)";
  if (n.includes("isced 5") || n.includes("wyższe") || n.includes("wyzsze"))
    return "Wyższe (ISCED 5–8)";
  return null;
}

/** Mapowanie statusu na rynku pracy (dane robocze) na słownik SOWA. */
export function mapujStatus(s: string): string | null {
  const n = s.toLowerCase();
  if (SLOWNIK_STATUS.includes(s)) return s;
  if (n.includes("bezrobotn")) return "Osoba bezrobotna";
  if (n.includes("biern")) return "Osoba bierna zawodowo";
  if (n.includes("pracując") || n.includes("pracujac"))
    return "Osoba pracująca";
  return null;
}

/** Wartość „w tym” wynikająca ze statusu (reguły SOWA). */
export function wTymDlaStatusu(statusSowa: string): string {
  if (statusSowa === "Osoba bezrobotna") return "Inne";
  if (statusSowa === "Osoba bierna zawodowo")
    return "Osoba nieuczestnicząca w kształceniu lub szkoleniu";
  return "";
}

export function walidujUczestnika(u: Uczestnik): ProblemWalidacji[] {
  const p: ProblemWalidacji[] = [];
  const dodaj = (
    poziom: PoziomProblemu,
    pole: string,
    komunikat: string,
  ) => p.push({ uczestnikId: u.id, poziom, pole, komunikat });

  const s = u.sowa;

  // PESEL
  if (!s?.pesel) {
    dodaj("blad", "PESEL", "Brak numeru PESEL — wymagany do importu SOWA.");
  } else {
    const w = walidujPesel(s.pesel);
    if (!w.poprawny) {
      dodaj(
        "blad",
        "PESEL",
        `Niepoprawny PESEL „${s.pesel}” (format lub suma kontrolna).`,
      );
    } else if (s.plec && w.plec && s.plec !== w.plec) {
      dodaj(
        "blad",
        "Płeć",
        `Płeć „${s.plec}” niezgodna z numerem PESEL (wynika: ${w.plec}).`,
      );
    }
  }

  // Płeć / wiek
  if (!s?.plec) dodaj("blad", "Płeć", "Brak płci (Kobieta/Mężczyzna).");
  if (!s?.wiek)
    dodaj(
      "blad",
      "Wiek",
      "Brak wieku w chwili przystąpienia do projektu.",
    );

  // Obywatelstwo
  if (!s?.obywatelstwo) {
    dodaj("blad", "Obywatelstwo", "Brak obywatelstwa.");
  } else if (!SLOWNIK_OBYWATELSTWO.includes(s.obywatelstwo)) {
    const pol = s.obywatelstwo.toLowerCase().includes("pol");
    dodaj(
      pol ? "ostrzezenie" : "blad",
      "Obywatelstwo",
      pol
        ? `„${s.obywatelstwo}” → przy eksporcie zostanie zapisane jako „Obywatelstwo polskie”.`
        : `Wartość „${s.obywatelstwo}” spoza słownika SOWA — wymaga ręcznej weryfikacji.`,
    );
  }

  // Wykształcenie
  if (!s?.wyksztalcenie) {
    dodaj("blad", "Wykształcenie", "Brak wykształcenia (słownik ISCED).");
  } else if (!SLOWNIK_WYKSZTALCENIE.includes(s.wyksztalcenie)) {
    const m = mapujWyksztalcenie(s.wyksztalcenie);
    if (m) {
      dodaj(
        "ostrzezenie",
        "Wykształcenie",
        `„${s.wyksztalcenie}” → przy eksporcie: „${m}”.`,
      );
    } else {
      dodaj(
        "blad",
        "Wykształcenie",
        `Wartość „${s.wyksztalcenie}” spoza słownika ISCED (uwaga: em-dash „–”, nie dywiz „-”).`,
      );
    }
  } else if (s.wyksztalcenie.includes("5-8") || s.wyksztalcenie.includes("0-2")) {
    dodaj(
      "blad",
      "Wykształcenie",
      "Zakres ISCED zapisany dywizem „-” — SOWA wymaga em-dash „–”.",
    );
  }

  // Status na rynku pracy
  if (!s?.statusRynkuPracy) {
    dodaj("blad", "Status", "Brak statusu osoby na rynku pracy.");
  } else if (!SLOWNIK_STATUS.includes(s.statusRynkuPracy)) {
    const m = mapujStatus(s.statusRynkuPracy);
    if (m) {
      dodaj(
        "ostrzezenie",
        "Status",
        `„${s.statusRynkuPracy}” → przy eksporcie: „${m}” (w tym: „${wTymDlaStatusu(m) || "—"}”).`,
      );
    } else {
      dodaj(
        "blad",
        "Status",
        `Status „${s.statusRynkuPracy}” spoza słownika SOWA.`,
      );
    }
  }

  // Spójność statusu z kategorią/ścieżką
  if (s?.statusRynkuPracy) {
    const m = mapujStatus(s.statusRynkuPracy);
    if (m === "Osoba bezrobotna" && u.kategoria !== "bezrobotny")
      dodaj(
        "blad",
        "Status",
        "Status „bezrobotna” niezgodny z kategorią uczestnika (bierny/IPR).",
      );
    if (m === "Osoba bierna zawodowo" && u.kategoria !== "bierny")
      dodaj(
        "blad",
        "Status",
        "Status „bierna zawodowo” niezgodny z kategorią uczestnika (bezrobotny/IPZS).",
      );
  }

  // Adres
  if (!s?.kodPocztowy) {
    dodaj("blad", "Kod pocztowy", "Brak kodu pocztowego.");
  } else if (!RE_KOD.test(s.kodPocztowy)) {
    dodaj(
      "blad",
      "Kod pocztowy",
      `Kod „${s.kodPocztowy}” — wymagany format 00-000.`,
    );
  }
  if (!s?.gmina)
    dodaj(
      "ostrzezenie",
      "Gmina",
      "Brak gminy — SOWA wymaga nazwy gminy wg TERYT (nie nazwy wsi).",
    );
  if (!s?.miejscowosc)
    dodaj("ostrzezenie", "Miejscowość", "Brak miejscowości (wg TERYT).");
  if (s?.powiat && s.powiat !== s.powiat.toLowerCase())
    dodaj(
      "ostrzezenie",
      "Powiat",
      "Powiat zapisuje się małymi literami w formie przymiotnikowej (np. „świebodziński”).",
    );
  if (!s?.degurba)
    dodaj("ostrzezenie", "DEGURBA", "Brak stopnia urbanizacji (1/2/3).");

  // Kontakt
  if (!s?.telefon)
    dodaj("blad", "Telefon", "Brak telefonu kontaktowego (pole wymagane).");
  if (!s?.email) {
    dodaj("blad", "E-mail", "Brak adresu e-mail (pole wymagane).");
  } else if (RE_PL_ZNAKI.test(s.email)) {
    dodaj(
      "blad",
      "E-mail",
      "Adres e-mail zawiera polskie znaki diakrytyczne.",
    );
  }

  // Daty
  if (
    u.dataPrzystapienia &&
    u.dataPrzystapienia !== "—" &&
    !RE_DATA.test(u.dataPrzystapienia)
  )
    dodaj(
      "blad",
      "Data rozpoczęcia",
      `Data „${u.dataPrzystapienia}” — wymagany format yyyy-MM-dd.`,
    );
  if (u.status === "aktywny" && (!u.dataPrzystapienia || u.dataPrzystapienia === "—"))
    dodaj(
      "blad",
      "Data rozpoczęcia",
      "Uczestnik aktywny bez daty rozpoczęcia udziału.",
    );

  return p;
}

export interface WynikWalidacji {
  problemy: ProblemWalidacji[];
  bledy: number;
  ostrzezenia: number;
  czysci: number;
}

export function walidujBaze(uczestnicy: Uczestnik[]): WynikWalidacji {
  const problemy = uczestnicy.flatMap(walidujUczestnika);
  const zProblemami = new Set(problemy.map((p) => p.uczestnikId));
  return {
    problemy,
    bledy: problemy.filter((p) => p.poziom === "blad").length,
    ostrzezenia: problemy.filter((p) => p.poziom === "ostrzezenie").length,
    czysci: uczestnicy.length - zProblemami.size,
  };
}
