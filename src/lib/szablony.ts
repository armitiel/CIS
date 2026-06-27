// Szablony własne .docx z polami dynamicznymi — mechanizm "mail merge".
// Użytkownik wgrywa wzór dokumentu .docx zawierający znaczniki {{pole}},
// a aplikacja wypełnia je danymi uczestnika z kartoteki (struktura SOWA).
// Wypełnianie: docxtemplater + pizzip, w całości w przeglądarce.

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import JSZip from "jszip";
import type { Uczestnik } from "./types";
import type { SpecyfikacjaProjektu } from "./projekt-spec";

/** Pola dynamiczne dostępne w szablonach — klucz = znacznik {{klucz}} w .docx */
export const LISTA_POL: [string, string][] = [
  ["imie", "Imię uczestnika"],
  ["nazwisko", "Nazwisko uczestnika"],
  ["imie_nazwisko", "Imię i nazwisko"],
  ["pesel", "PESEL"],
  ["data_urodzenia", "Data urodzenia (z PESEL)"],
  ["plec", "Płeć"],
  ["wiek", "Wiek w chwili przystąpienia"],
  ["wyksztalcenie", "Wykształcenie (ISCED)"],
  ["obywatelstwo", "Obywatelstwo"],
  ["adres", "Adres (ulica, nr, kod, miejscowość)"],
  ["ulica_nr", "Ulica, nr domu / lokalu"],
  ["kraj", "Kraj"],
  ["miejscowosc", "Miejscowość"],
  ["gmina", "Gmina"],
  ["powiat", "Powiat"],
  ["wojewodztwo", "Województwo"],
  ["kod_pocztowy", "Kod pocztowy"],
  ["degurba", "Obszar DEGURBA"],
  ["telefon", "Telefon"],
  ["email", "Adres e-mail"],
  ["status_rynku_pracy", "Status na rynku pracy (SOWA)"],
  ["kategoria", "Kategoria (bezrobotny / bierny zawodowo)"],
  ["sciezka", "Ścieżka (IPZS / IPR)"],
  ["cykl", "Cykl rekrutacji"],
  ["grupa", "Grupa"],
  ["status_udzialu", "Status udziału w projekcie"],
  ["data_przystapienia", "Data rozpoczęcia udziału"],
  ["projekt_nazwa", "Nazwa projektu"],
  ["projekt_nabor", "Numer naboru"],
  ["projekt_okres", "Okres realizacji projektu"],
  ["wnioskodawca", "Nazwa wnioskodawcy"],
  ["data_dzis", "Dzisiejsza data"],
  // pola agregowane z obecności (liczone per uczestnik za wybrany okres)
  ["frekwencja", "Frekwencja % (z obecności)"],
  ["dni_obecny", "Liczba dni obecności"],
  ["dni_nieobecny", "Liczba nieobecności (NN)"],
  ["dni_l4", "Liczba dni zwolnienia lekarskiego (L4)"],
  ["dni_wolne", "Liczba dni wolnych (DW)"],
  ["dni_wsparcia", "Liczba dni wsparcia (obecności)"],
  ["okres_obecnosci", "Okres, za który liczono obecność"],
];

const PUSTE = "……………………";

/** Data urodzenia wyliczona z PESEL (stulecie kodowane w miesiącu). */
function dataUrodzeniaZPesel(pesel?: string): string {
  if (!pesel || !/^\d{11}$/.test(pesel)) return "";
  let rok = parseInt(pesel.slice(0, 2), 10);
  let miesiac = parseInt(pesel.slice(2, 4), 10);
  const dzien = parseInt(pesel.slice(4, 6), 10);
  if (miesiac > 80) {
    rok += 1800;
    miesiac -= 80;
  } else if (miesiac > 20) {
    rok += 2000;
    miesiac -= 20;
  } else {
    rok += 1900;
  }
  if (miesiac < 1 || miesiac > 12 || dzien < 1 || dzien > 31) return "";
  return `${String(dzien).padStart(2, "0")}.${String(miesiac).padStart(2, "0")}.${rok}`;
}

/** Komplet wartości pól dla uczestnika (brakujące dane → kropki do uzupełnienia). */
export function polaUczestnika(
  u: Uczestnik,
  spec: SpecyfikacjaProjektu,
  extra?: Record<string, string>,
): Record<string, string> {
  const s = u.sowa ?? {};
  const v = (x?: string | number) =>
    x !== undefined && x !== null && String(x).trim() !== ""
      ? String(x)
      : PUSTE;
  // znacznik checkboxa do szablonów: ☒ gdy spełnione, inaczej ☐
  const cb = (warunek: boolean) => (warunek ? "☒" : "☐");
  const wyk = (s.wyksztalcenie ?? "").toLowerCase();
  const iscedWyzsze = /isced\s*[5678]|wy[żz]sze/.test(wyk);
  const iscedSrednie = /isced\s*[34]|ponadgimn|policeal|średnie ii/.test(wyk);
  const ulicaNr = s.ulica
    ? `${s.ulica} ${s.nrDomu ?? ""}${s.nrLokalu ? "/" + s.nrLokalu : ""}`.trim()
    : PUSTE;
  const krajVal =
    s.kraj && s.kraj.toLowerCase().includes("pol")
      ? "Polska"
      : s.kraj || "Polska";
  // A-03 część III — punktacja premiująca
  const kobieta = s.plec === "kobieta";
  const pktPlec = kobieta ? 10 : 0;
  const pktWielokrotne = 10; // wielokrotne wykluczenie u wszystkich
  // A-03 część IV — opis rozmowy kwalifikacyjnej (różne brzmienie per osoba)
  const K = kobieta ? "Kandydatka" : "Kandydat";
  const zmot = kobieta ? "zmotywowana" : "zmotywowany";
  const warianty = [
    `${K} wykazuje wysoką motywację do zmiany swojej sytuacji. Posiada predyspozycje do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia.`,
    `Motywacja do zmiany sytuacji wysoka; widoczne predyspozycje do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia.`,
    `${K} prezentuje silną motywację do zmiany sytuacji oraz predyspozycje do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia reintegracyjnego.`,
    `Wysoka motywacja do zmiany sytuacji. Predyspozycje do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia.`,
    `${K} ${zmot} do zmiany swojej sytuacji, z predyspozycjami do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia.`,
    `Rozmowa potwierdziła wysoką motywację do zmiany sytuacji i predyspozycje do rozwoju aktywności społecznej i zawodowej. Sytuacja indywidualna wymaga wsparcia.`,
  ];
  const seed = (s.pesel ?? "").split("").reduce((a, c) => a + (Number(c) || 0), 0);
  const opisRozmowy = warianty[seed % warianty.length];
  // B-02 — data/miejsce diagnozy
  const dzienDiagnozy = String((seed % 10) + 1).padStart(2, "0");
  const dataDiagnozy = `${dzienDiagnozy}.06.2026`;
  // B-02 cz. III — opisy (różne brzmienie per osoba)
  const wBariery = [
    "brak środków na edukację",
    "ograniczone środki finansowe na edukację i rozwój",
    "brak środków na edukację, niskie dochody",
    "trudna sytuacja materialna, brak środków na edukację",
  ];
  const wMocne = [
    "motywacja do zmiany sytuacji",
    "wysoka motywacja do zmiany swojej sytuacji życiowej",
    "chęć i motywacja do zmiany sytuacji",
    "determinacja i motywacja do zmiany sytuacji",
  ];
  const wRekom = [
    "reintegracja społeczna, spotkania integracyjne, kursy zawodowe",
    "reintegracja społeczna i zawodowa, spotkania integracyjne, kursy zawodowe",
    "udział w reintegracji społecznej, spotkaniach integracyjnych i kursach zawodowych",
    "reintegracja społeczna, zajęcia integracyjne oraz kursy zawodowe",
  ];
  // B-02 cz. II — poziomy 1-3 z przewagą niskich (1,2), deterministycznie per osoba/wiersz
  const seqPoz = [1, 1, 2, 2, 3];
  const poziomy: Record<string, string> = {};
  for (let i = 1; i <= 18; i++) {
    poziomy["poz" + i] = String(seqPoz[(seed * 3 + i * 7) % seqPoz.length]);
  }
  return {
    imie: v(u.imie),
    nazwisko: v(u.nazwisko),
    imie_nazwisko: `${u.imie} ${u.nazwisko}`,
    pesel: v(s.pesel),
    data_urodzenia: v(dataUrodzeniaZPesel(s.pesel)),
    plec: v(s.plec),
    wiek: v(s.wiek),
    wyksztalcenie: v(s.wyksztalcenie),
    obywatelstwo: v(s.obywatelstwo),
    kraj: krajVal,
    ulica_nr: ulicaNr,
    adres: s.miejscowosc
      ? `${ulicaNr !== PUSTE ? "ul. " + ulicaNr + ", " : ""}${s.kodPocztowy ?? PUSTE} ${s.miejscowosc}`.trim()
      : PUSTE,
    miejscowosc: v(s.miejscowosc),
    gmina: v(s.gmina),
    powiat: v(s.powiat),
    wojewodztwo: v(s.wojewodztwo),
    kod_pocztowy: v(s.kodPocztowy),
    degurba: v(s.degurba),
    cb_kobieta: cb(s.plec === "kobieta"),
    cb_mezczyzna: cb(s.plec === "mężczyzna"),
    cb_miasto: cb(s.degurba === "1" || s.degurba === "2"),
    cb_wies: cb(s.degurba === "3"),
    cb_isced58: cb(iscedWyzsze),
    cb_isced34: cb(!iscedWyzsze && iscedSrednie),
    cb_isced02: cb(!iscedWyzsze && !iscedSrednie),
    // A-03: punkty cz. III + opis rozmowy cz. IV
    pkt_plec: String(pktPlec),
    pkt_wielokrotne: String(pktWielokrotne),
    pkt_suma: String(pktPlec + pktWielokrotne),
    rozmowa_opis: opisRozmowy,
    // B-02
    data_diagnozy: dataDiagnozy,
    miejsce_diagnozy: "Świebodzin",
    bariery: wBariery[seed % wBariery.length],
    mocne: wMocne[(seed + 1) % wMocne.length],
    rekomendacje: wRekom[(seed + 2) % wRekom.length],
    ...poziomy,
    telefon: v(s.telefon),
    email: v(s.email),
    status_rynku_pracy: v(s.statusRynkuPracy),
    kategoria:
      u.kategoria === "bezrobotny"
        ? "osoba bezrobotna (uczestnik CIS)"
        : "osoba bierna zawodowo",
    sciezka: u.sciezka,
    cykl: String(u.cykl),
    grupa: v(u.grupa === "—" ? "" : u.grupa),
    status_udzialu: u.status,
    data_przystapienia:
      u.dataPrzystapienia === "—" ? PUSTE : u.dataPrzystapienia,
    projekt_nazwa: spec.nazwa,
    projekt_nabor: spec.nabor,
    projekt_okres: spec.okres,
    wnioskodawca: spec.wnioskodawca,
    data_dzis: new Date().toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    // pola agregowane (obecność/świadczenia) — domyślnie puste, nadpisywane przez extra
    frekwencja: PUSTE,
    dni_obecny: PUSTE,
    dni_nieobecny: PUSTE,
    dni_l4: PUSTE,
    dni_wolne: PUSTE,
    dni_wsparcia: PUSTE,
    okres_obecnosci: PUSTE,
    ...(extra ?? {}),
  };
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Wypełnia szablon .docx danymi — zwraca gotowy plik jako Blob. */
export function wypelnijSzablon(
  szablon: ArrayBuffer,
  dane: Record<string, string>,
): Blob {
  const zip = new PizZip(szablon);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => PUSTE,
  });
  doc.render(dane);
  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as Blob;
}

function pobierzBlob(blob: Blob, nazwa: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwa;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generuje dokument z szablonu dla jednego uczestnika i pobiera go. */
export function generujZSzablonu(
  szablon: ArrayBuffer,
  nazwaSzablonu: string,
  u: Uczestnik,
  spec: SpecyfikacjaProjektu,
  dodatkowePola?: (u: Uczestnik) => Record<string, string>,
) {
  const blob = wypelnijSzablon(
    szablon,
    polaUczestnika(u, spec, dodatkowePola?.(u)),
  );
  pobierzBlob(
    blob,
    `${slug(nazwaSzablonu.replace(/\.docx$/i, ""))}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`,
  );
}

/** Generuje dokumenty z szablonu dla wielu uczestników — jeden plik ZIP. */
export async function generujZSzablonuZbiorczo(
  szablon: ArrayBuffer,
  nazwaSzablonu: string,
  uczestnicy: Uczestnik[],
  spec: SpecyfikacjaProjektu,
  dodatkowePola?: (u: Uczestnik) => Record<string, string>,
) {
  const zip = new JSZip();
  const baza = slug(nazwaSzablonu.replace(/\.docx$/i, ""));
  for (const u of uczestnicy) {
    const blob = wypelnijSzablon(
      szablon,
      polaUczestnika(u, spec, dodatkowePola?.(u)),
    );
    zip.file(`${baza}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`, blob);
  }
  const wynik = await zip.generateAsync({ type: "blob" });
  pobierzBlob(wynik, `${baza}_${slug(spec.id)}_wszyscy.zip`);
}

// ===== Przechowywanie szablonów per projekt (localStorage, base64) =====

export interface SzablonZapisany {
  nazwa: string;
  base64: string;
  dodano: string; // ISO data
}

const kluczSzablonow = (projektId: string) => `cis-app:szablony:${projektId}`;

export function wczytajSzablony(projektId: string): SzablonZapisany[] {
  try {
    const raw = localStorage.getItem(kluczSzablonow(projektId));
    return raw ? (JSON.parse(raw) as SzablonZapisany[]) : [];
  } catch {
    return [];
  }
}

export function zapiszSzablony(projektId: string, szablony: SzablonZapisany[]) {
  try {
    localStorage.setItem(kluczSzablonow(projektId), JSON.stringify(szablony));
  } catch {
    /* przekroczony limit localStorage — szablon zostanie tylko w pamięci */
  }
}

export function base64ZArrayBuffer(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function arrayBufferZBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
