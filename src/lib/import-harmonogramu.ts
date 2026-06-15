// Import harmonogramu z pliku: tabela (Excel/CSV) → wpisy 1:1, dokument
// (Word/PDF/TXT) → heurystyka (data + godziny + nazwa), oraz generator
// propozycji rozłożonej na okres projektu. Zwraca propozycje do akceptacji
// w module Harmonogram (nic nie zapisuje samodzielnie).

import * as XLSX from "xlsx";
import { wyciagnijTekstZPliku } from "./analiza-wniosku";
import type { Zajecie } from "./db-zajecia";
import type { KolorZajec } from "./types";

export type WpisHarmonogramu = Omit<Zajecie, "id">;

export interface WynikImportuHarmonogramu {
  wpisy: WpisHarmonogramu[];
  uwagi: string[];
  zrodlo: "tabela" | "dokument";
}

const KOLORY: KolorZajec[] = ["green", "blue", "amber"];
const p2 = (n: number | string) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

type Pole = keyof WpisHarmonogramu;

/** Dopasowanie nagłówka kolumny do pola wpisu. */
function klasyfikujNaglowek(naglowek: string): Pole | null {
  const n = norm(naglowek);
  if (/(godz|czas).*do|^do$|koniec|^-$/.test(n)) return "godzinaDo";
  if (/(godz|czas).*od|^od$|poczatek|start|^godzina$|^godz$|^czas$/.test(n))
    return "godzina";
  if (/data|termin|dzien|kiedy/.test(n)) return "data";
  if (/nazwa|zaj|forma|wsparci|temat|dzialani|warsztat|tytul|opis/.test(n))
    return "nazwa";
  if (/prowadz|trener|specjalist|kadra|osoba|wykladowc|doradc/.test(n))
    return "prowadzacy";
  if (/grupa|cykl/.test(n)) return "grupa";
  if (/typ|rodzaj|kategori/.test(n)) return "typ";
  return null;
}

function doISO(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return iso(v);
  const s = String(v ?? "").trim();
  if (!s) return "";
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (m) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  const n = Number(s);
  if (!isNaN(n) && n > 30000 && n < 80000) {
    // numer seryjny Excela (dni od 1899-12-30)
    return iso(new Date(Date.UTC(1899, 11, 30) + n * 86400000));
  }
  return "";
}

function doGodzine(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime()))
    return `${p2(v.getHours())}:${p2(v.getMinutes())}`;
  const s = String(v ?? "").trim();
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (m) return `${p2(m[1])}:${m[2]}`;
  const n = Number(s);
  if (!isNaN(n) && n > 0 && n < 1) {
    const min = Math.round(n * 24 * 60);
    return `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;
  }
  return "";
}

function pustyWpis(i = 0): WpisHarmonogramu {
  return {
    data: "",
    godzina: "",
    godzinaDo: "",
    nazwa: "",
    typ: "",
    prowadzacy: "",
    grupa: "",
    kolor: KOLORY[i % KOLORY.length],
    osob: 0,
  };
}

// ---- Tabela (Excel/CSV) -----------------------------------------------------

function parsujTabele(buf: ArrayBuffer): WynikImportuHarmonogramu {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const wiersze = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  const uwagi: string[] = [];
  if (wiersze.length === 0) {
    return { wpisy: [], uwagi: ["Pusty arkusz."], zrodlo: "tabela" };
  }
  // mapowanie kolumn z nagłówków
  const mapa = new Map<string, Pole>();
  for (const klucz of Object.keys(wiersze[0])) {
    const pole = klasyfikujNaglowek(klucz);
    if (pole && ![...mapa.values()].includes(pole)) mapa.set(klucz, pole);
  }
  if (![...mapa.values()].includes("data")) {
    uwagi.push(
      "Nie rozpoznano kolumny z datą — sprawdź nagłówki (np. Data, Termin).",
    );
  }
  const wpisy: WpisHarmonogramu[] = [];
  wiersze.forEach((row, i) => {
    const w = pustyWpis(i);
    for (const [klucz, pole] of mapa) {
      const val = row[klucz];
      if (pole === "data") w.data = doISO(val);
      else if (pole === "godzina") w.godzina = doGodzine(val);
      else if (pole === "godzinaDo") w.godzinaDo = doGodzine(val);
      else w[pole] = String(val ?? "").trim().slice(0, 120) as never;
    }
    if (w.data || w.nazwa) wpisy.push(w);
  });
  uwagi.unshift(
    `Wczytano ${wpisy.length} wierszy z tabeli (kolumny: ${[...mapa.values()].join(", ") || "brak rozpoznanych"}).`,
  );
  return { wpisy, uwagi, zrodlo: "tabela" };
}

// ---- Dokument (Word/PDF/TXT) ------------------------------------------------

function parsujTekst(tekst: string): WynikImportuHarmonogramu {
  const linie = tekst.split(/\r?\n/);
  const wpisy: WpisHarmonogramu[] = [];
  const reData = /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/;
  const reZakres =
    /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/;
  const reGodz = /(\d{1,2}[:.]\d{2})/;
  let i = 0;
  for (const linia of linie) {
    const mData = linia.match(reData);
    if (!mData) continue;
    const data = doISO(mData[1]);
    if (!data) continue;
    const w = pustyWpis(i++);
    w.data = data;
    const mZakres = linia.match(reZakres);
    if (mZakres) {
      w.godzina = doGodzine(mZakres[1]);
      w.godzinaDo = doGodzine(mZakres[2]);
    } else {
      const mG = linia.match(reGodz);
      if (mG) w.godzina = doGodzine(mG[1]);
    }
    // nazwa = reszta linii bez daty i godzin (przycięta — chroni przed
    // wklejeniem całego akapitu dokumentu jako nazwy zajęć)
    const nazwaRaw =
      linia
        .replace(reData, " ")
        .replace(reZakres, " ")
        .replace(reGodz, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s:.\-–—|]+|[\s:.\-–—|]+$/g, "")
        .trim() || "Zajęcia";
    w.nazwa =
      nazwaRaw.length > 80 ? `${nazwaRaw.slice(0, 80).trimEnd()}…` : nazwaRaw;
    wpisy.push(w);
  }
  const uwagi =
    wpisy.length > 0
      ? [
          `Rozpoznano ${wpisy.length} pozycji z dokumentu (heurystyka data + godziny). Zweryfikuj nazwy i prowadzących.`,
        ]
      : [
          "Nie znaleziono w dokumencie linii z datami. Spróbuj pliku tabelarycznego (Excel/CSV) albo wygeneruj propozycję na okres.",
        ];
  return { wpisy, uwagi, zrodlo: "dokument" };
}

/** Parsuje wgrany plik harmonogramu (tabela albo dokument). */
export async function parsujPlikHarmonogramu(
  file: File,
): Promise<WynikImportuHarmonogramu> {
  const n = file.name.toLowerCase();
  if (/\.(xlsx|xls|csv)$/.test(n)) {
    return parsujTabele(await file.arrayBuffer());
  }
  if (/\.(docx|pdf|txt)$/.test(n)) {
    const tekst = await wyciagnijTekstZPliku(file);
    return parsujTekst(tekst);
  }
  throw new Error(
    "Nieobsługiwany format. Wczytaj Excel/CSV (.xlsx, .csv) albo dokument (.docx, .pdf, .txt).",
  );
}

// ---- Propozycja rozłożona na okres -----------------------------------------

const FORMY_WSPARCIA: { nazwa: string; typ: string; od: string; do: string }[] = [
  { nazwa: "Warsztaty reintegracji społecznej", typ: "warsztaty", od: "09:00", do: "12:00" },
  { nazwa: "Reintegracja zawodowa — zajęcia praktyczne", typ: "warsztaty", od: "09:00", do: "13:00" },
  { nazwa: "Doradztwo zawodowe / spotkania indywidualne", typ: "doradztwo", od: "10:00", do: "13:00" },
  { nazwa: "Grupa wsparcia / praca z psychologiem", typ: "wsparcie", od: "10:00", do: "12:00" },
];

/** Pierwsza data od `od` przypadająca na wskazany dzień tygodnia (1=Pn..5=Pt). */
function nastepnyDzien(od: Date, dzienTyg: number): Date {
  const d = new Date(od);
  const diff = (dzienTyg - ((d.getDay() + 6) % 7) + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Propozycja startowa rozłożona na okres projektu: cykliczne formy wsparcia
 * w Pn/Śr/Pt przez `tygodnie` tygodni od początku okresu. Do akceptacji/edycji.
 */
export function propozycjaNaOkres(
  okres: string,
  tygodnie = 4,
): WynikImportuHarmonogramu {
  const mStart = okres.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  const start = mStart
    ? new Date(Number(mStart[3]), Number(mStart[2]) - 1, Number(mStart[1]))
    : new Date();
  start.setHours(0, 0, 0, 0);

  const dni = [0, 2, 4]; // Pn, Śr, Pt
  const wpisy: WpisHarmonogramu[] = [];
  let licznik = 0;
  for (let t = 0; t < tygodnie; t++) {
    dni.forEach((dt, j) => {
      const dzien = nastepnyDzien(start, dt);
      dzien.setDate(dzien.getDate() + t * 7);
      const forma = FORMY_WSPARCIA[(j + t) % FORMY_WSPARCIA.length];
      wpisy.push({
        data: iso(dzien),
        godzina: forma.od,
        godzinaDo: forma.do,
        nazwa: forma.nazwa,
        typ: forma.typ,
        prowadzacy: "",
        grupa: "A",
        kolor: KOLORY[licznik++ % KOLORY.length],
        osob: 0,
      });
    });
  }
  wpisy.sort((a, b) => a.data.localeCompare(b.data));
  return {
    wpisy,
    uwagi: [
      `Propozycja startowa: ${wpisy.length} zajęć na ${tygodnie} tygodnie od ${iso(start)} (Pn/Śr/Pt). Dostosuj terminy, formy i prowadzących przed zapisem.`,
    ],
    zrodlo: "dokument",
  };
}
