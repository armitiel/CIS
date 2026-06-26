// Import grafiku kadry z pliku Excel "Plan_pracy_kadry_CIS.xlsx" (etap E9).
// Czyta zakładki miesięcy (Czerwiec..Grudzień) i z każdego wiersza planu
// odczytuje widoczne kolumny: A=Data, C=Osoba, D=Typ, E=Godz. od, F=Godz. do,
// H=Zadanie. Te kolumny zawierają dane wpisane ręcznie (nie formuły), więc są
// czytelne niezależnie od przeliczenia pliku. Osoby na etacie nie są w tych
// zakładkach (ich karty liczone są regułą), więc import dotyczy kadry „z planu".

import * as XLSX from "xlsx";
import type { TypZajec } from "@/lib/db-grafik-kadry";

export interface WierszImportu {
  miesiac: string;
  dataISO: string;
  osoba: string; // etykieta "Nazwisko Imię"
  typ: TypZajec;
  od: string;
  do: string;
  zadanie: string;
}

const ZAKLADKI_MIESIECY = [
  "Czerwiec", "Lipiec", "Sierpień", "Wrzesień",
  "Październik", "Listopad", "Grudzień",
];

function dwa(n: number): string {
  return String(n).padStart(2, "0");
}

function isoZDaty(v: unknown): string {
  if (v instanceof Date) {
    return `${v.getFullYear()}-${dwa(v.getMonth() + 1)}-${dwa(v.getDate())}`;
  }
  if (typeof v === "number") {
    // numer seryjny Excela → data (epoka 1899-12-30)
    const dt = new Date(Math.round((v - 25569) * 86400 * 1000));
    return `${dt.getUTCFullYear()}-${dwa(dt.getUTCMonth() + 1)}-${dwa(dt.getUTCDate())}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${dwa(+m[2])}-${dwa(+m[3])}`;
    m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(s);
    if (m) return `${m[3]}-${dwa(+m[2])}-${dwa(+m[1])}`;
  }
  return "";
}

function czas(v: unknown): string {
  if (typeof v === "string") {
    const m = /^(\d{1,2}):(\d{2})/.exec(v.trim());
    return m ? `${dwa(+m[1])}:${m[2]}` : "";
  }
  if (typeof v === "number" && v >= 0 && v < 1.0001) {
    const mins = Math.round(v * 24 * 60);
    return `${dwa(Math.floor(mins / 60))}:${dwa(mins % 60)}`;
  }
  if (v instanceof Date) {
    return `${dwa(v.getHours())}:${dwa(v.getMinutes())}`;
  }
  return "";
}

function normTyp(v: unknown): TypZajec {
  return String(v ?? "").toLowerCase().startsWith("ind")
    ? "indywidualne"
    : "grupowe";
}

/** Parsuje plik Excel (ArrayBuffer) → lista wpisów grafiku z zakładek miesięcy. */
export function parsujGrafikZXlsx(buf: ArrayBuffer): {
  wiersze: WierszImportu[];
  miesiace: string[];
} {
  const wb = XLSX.read(buf, { cellDates: true });
  const wiersze: WierszImportu[] = [];
  const miesiace: string[] = [];
  for (const tab of ZAKLADKI_MIESIECY) {
    const ws = wb.Sheets[tab];
    if (!ws) continue;
    let znalezione = 0;
    for (let r = 4; r <= 43; r++) {
      const a = ws[`A${r}`]?.v;
      const c = ws[`C${r}`]?.v;
      if (a == null || c == null || String(c).trim() === "") continue;
      const dataISO = isoZDaty(a);
      const od = czas(ws[`E${r}`]?.v);
      const doG = czas(ws[`F${r}`]?.v);
      if (!dataISO || !od || !doG) continue;
      wiersze.push({
        miesiac: tab,
        dataISO,
        osoba: String(c).trim(),
        typ: normTyp(ws[`D${r}`]?.v),
        od,
        do: doG,
        zadanie: String(ws[`H${r}`]?.v ?? "").trim(),
      });
      znalezione++;
    }
    if (znalezione > 0) miesiace.push(tab);
  }
  return { wiersze, miesiace };
}
