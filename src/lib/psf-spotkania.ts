import * as XLSX from "xlsx";

import { specyfikacjaPSF } from "./projekty";
import { polaUczestnika } from "./szablony";
import type { Uczestnik } from "./types";

export interface SpotkaniePSF {
  id: string;
  uczestnikId: string;
  nrUczestnika: string;
  uczestnik: string;
  grupa: string;
  doradca: string;
  data: string;
  godzinaOd: string;
  godzinaDo: string;
  minuty: number;
  zadanie: string;
}

const ZADANIE = "Doradztwo zawodowe i bilans kompetencji";

function poprawnaData(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00`));
}

function minuty(t: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
}

/** Doradca wynika z miejsca/grupy formularza; uczestników Pomost obsługuje Doradca 1. */
export function doradcaPSF(u: Uczestnik): string {
  return /gorz[oó]w/i.test(u.grupa)
    ? "Doradca 2 — Gorzów"
    : "Doradca 1 — Korina Łukaszkiewicz";
}

/**
 * Jedno źródło terminów PSF. Używa dokładnie tych samych pól, które zasilają PAK2,
 * więc harmonogram i ewidencja nie wymagają ponownego wpisywania danych.
 */
export function spotkaniaZFormularzyPSF(uczestnicy: Uczestnik[]): SpotkaniePSF[] {
  return uczestnicy
    .filter((u) => u.status !== "rezerwowy" && u.status !== "przerwał")
    .flatMap((u) => {
      const pola = polaUczestnika(u, specyfikacjaPSF);
      const od = pola.godzina_spotkania_od;
      const doG = pola.godzina_spotkania_do;
      const a = minuty(od);
      const b = minuty(doG);
      if (!poprawnaData(u.dataPrzystapienia) || !Number.isFinite(a) || !Number.isFinite(b) || b <= a)
        return [];
      return [{
        id: `psf-auto:${u.id}`,
        uczestnikId: u.id,
        nrUczestnika: pola.nr_umowy.split("/")[0] || "",
        uczestnik: `${u.imie} ${u.nazwisko}`.trim(),
        grupa: u.grupa === "—" ? "" : u.grupa,
        doradca: doradcaPSF(u),
        data: u.dataPrzystapienia,
        godzinaOd: od,
        godzinaDo: doG,
        minuty: b - a,
        zadanie: ZADANIE,
      }];
    })
    .sort((a, b) =>
      a.data === b.data
        ? a.godzinaOd.localeCompare(b.godzinaOd)
        : a.data.localeCompare(b.data),
    );
}

/**
 * Data, na której powinien otworzyć się harmonogram PSF: ostatnie spotkanie
 * nie późniejsze niż dziś, a gdy wszystkie są przyszłe — pierwsze spotkanie.
 */
export function dataStartowaHarmonogramuPSF(
  spotkania: SpotkaniePSF[],
  dzisISO: string,
): string | null {
  const daty = [...new Set(spotkania.map((s) => s.data))].sort();
  if (daty.length === 0) return null;
  return daty.filter((d) => d <= dzisISO).at(-1) ?? daty[0];
}

export interface DzienDoradcyPSF {
  data: string;
  doradca: string;
  liczbaSpotkan: number;
  godzinaOd: string;
  godzinaDo: string;
  godziny: number;
}

/**
 * Historyczne godziny Doradcy 2 odczytane z zatwierdzonych kart czasu pracy.
 * Nie przechowujemy tu danych osobowych uczestników. Wpis z formularza o tym
 * samym terminie zastępuje wpis historyczny, więc późniejszy import grupy
 * Gorzów nie podwoi godzin.
 */
const HISTORYCZNE_TERMINY_GORZOW: ReadonlyArray<[string, string, string]> = [
  ["2026-03-20", "15:00", "19:00"],
  ["2026-03-23", "15:00", "17:00"],
  ["2026-03-24", "15:00", "19:00"],
  ["2026-05-04", "15:00", "18:00"],
  ["2026-05-05", "15:00", "19:00"],
  ["2026-05-06", "15:00", "18:00"],
  ["2026-07-08", "15:00", "16:00"],
  ["2026-07-10", "15:00", "21:00"],
];

function historyczneSpotkaniaGorzowPSF(): SpotkaniePSF[] {
  return HISTORYCZNE_TERMINY_GORZOW.flatMap(([data, od, doG]) => {
    const start = minuty(od);
    const koniec = minuty(doG);
    const wynik: SpotkaniePSF[] = [];
    for (let t = start; t < koniec; t += 60) {
      const godzinaOd = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const nastepna = t + 60;
      const godzinaDo = `${String(Math.floor(nastepna / 60)).padStart(2, "0")}:${String(nastepna % 60).padStart(2, "0")}`;
      wynik.push({
        id: `psf-historyczne-gorzow:${data}:${godzinaOd}`,
        uczestnikId: "",
        nrUczestnika: "",
        uczestnik: "",
        grupa: "Gorzów",
        doradca: "Doradca 2 — Gorzów",
        data,
        godzinaOd,
        godzinaDo,
        minuty: 60,
        zadanie: ZADANIE,
      });
    }
    return wynik;
  });
}

export function spotkaniaDoKartCzasuPSF(spotkania: SpotkaniePSF[]): SpotkaniePSF[] {
  const polaczone = new Map<string, SpotkaniePSF>();
  for (const s of [...spotkania, ...historyczneSpotkaniaGorzowPSF()]) {
    const klucz = `${s.data}|${s.doradca}|${s.godzinaOd}|${s.godzinaDo}`;
    if (!polaczone.has(klucz) || s.uczestnikId) polaczone.set(klucz, s);
  }
  return [...polaczone.values()].sort((a, b) =>
    a.data === b.data
      ? a.godzinaOd.localeCompare(b.godzinaOd)
      : a.data.localeCompare(b.data),
  );
}

export function dniDoradcowPSF(spotkania: SpotkaniePSF[]): DzienDoradcyPSF[] {
  const mapa = new Map<string, SpotkaniePSF[]>();
  for (const s of spotkania) {
    const k = `${s.data}|${s.doradca}`;
    mapa.set(k, [...(mapa.get(k) ?? []), s]);
  }
  return [...mapa.values()]
    .map((lista) => ({
      data: lista[0].data,
      doradca: lista[0].doradca,
      liczbaSpotkan: lista.length,
      godzinaOd: lista.map((s) => s.godzinaOd).sort()[0],
      godzinaDo: lista.map((s) => s.godzinaDo).sort().at(-1) ?? "",
      godziny: lista.reduce((n, s) => n + s.minuty, 0) / 60,
    }))
    .sort((a, b) => a.data === b.data ? a.doradca.localeCompare(b.doradca) : a.data.localeCompare(b.data));
}

export function dniKartCzasuPSF(spotkania: SpotkaniePSF[]): DzienDoradcyPSF[] {
  return dniDoradcowPSF(spotkaniaDoKartCzasuPSF(spotkania));
}

function dataPL(iso: string): string {
  const [r, m, d] = iso.split("-");
  return `${d}/${m}/${r}`;
}

function szerokosci(ws: XLSX.WorkSheet, szer: number[]) {
  ws["!cols"] = szer.map((wch) => ({ wch }));
}

export function skoroszytKoordynacjiPSF(spotkania: SpotkaniePSF[]): XLSX.WorkBook {
  const wiersze: (string | number)[][] = [
    ["ARKUSZ KOORDYNACJI SPOTKAŃ DORADCZYCH"],
    [`Projekt ${specyfikacjaPSF.nabor} „${specyfikacjaPSF.nazwa}"`],
    [],
    ["Nr uczestnika", "Imię i nazwisko", "Grupa", "Doradca", "Data spotkania", "Godzina OD", "Godzina DO", "Czas (min)", "Uwagi"],
    ...spotkania.map((s) => [s.nrUczestnika, s.uczestnik, s.grupa, s.doradca, dataPL(s.data), s.godzinaOd, s.godzinaDo, s.minuty, ""]),
    [],
    ["PODSUMOWANIE DNI PRACY"],
    ["Data", "Doradca", "Liczba spotkań", "Godziny", "Godzin (h)", "Uwagi"],
    ...dniDoradcowPSF(spotkania).map((d) => [dataPL(d.data), d.doradca, d.liczbaSpotkan, `${d.godzinaOd}–${d.godzinaDo}`, d.godziny, ""]),
    [],
    ["RAZEM PROJEKT", "", spotkania.length, "", spotkania.reduce((n, s) => n + s.minuty, 0) / 60],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wiersze);
  ws["!merges"] = [XLSX.utils.decode_range("A1:I1"), XLSX.utils.decode_range("A2:I2"), XLSX.utils.decode_range(`A${spotkania.length + 7}:F${spotkania.length + 7}`)];
  ws["!autofilter"] = { ref: `A4:I${Math.max(4, spotkania.length + 4)}` };
  szerokosci(ws, [15, 30, 18, 32, 16, 13, 13, 12, 24]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Arkusz koordynacji");
  return wb;
}

const MIESIACE = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const DNI = ["nd", "pon", "wt", "śr", "czw", "pt", "sob"];

export function skoroszytKartyCzasuPSF(
  spotkania: SpotkaniePSF[], doradca: string, rok: number, miesiac: number,
): XLSX.WorkBook {
  const dni = dniKartCzasuPSF(spotkania).filter((d) => {
    const [r, m] = d.data.split("-").map(Number);
    return d.doradca === doradca && r === rok && m === miesiac + 1;
  });
  const wgDaty = new Map(dni.map((d) => [d.data, d]));
  const liczbaDni = new Date(rok, miesiac + 1, 0).getDate();
  const suma = dni.reduce((n, d) => n + d.godziny, 0);
  const rows: (string | number)[][] = [
    ["KARTA CZASU PRACY W PROJEKCIE"], [], [],
    ["Imię i nazwisko:", doradca.startsWith("Doradca 1 — ") ? doradca.replace(/^Doradca 1 — /, "") : ""],
    ["Projekt:", specyfikacjaPSF.nazwa],
    ["Stanowisko:", "Doradca zawodowy"],
    ["Wymiar godzin:", suma],
    ["Rok:", rok],
    ["Miesiąc:", MIESIACE[miesiac]], [],
    ["Lp.", "Data", "Dzień", "Zm. I od", "Zm. I do", "Zm. II od", "Zm. II do", "Razem godz.", "Czynności", "Podpis"],
  ];
  for (let i = 1; i <= liczbaDni; i++) {
    const iso = `${rok}-${String(miesiac + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const d = wgDaty.get(iso);
    rows.push([i, `${String(i).padStart(2, "0")}.${String(miesiac + 1).padStart(2, "0")}.${rok}`, DNI[new Date(rok, miesiac, i).getDay()], d?.godzinaOd ?? "", d?.godzinaDo ?? "", "", "", d?.godziny ?? "", d ? ZADANIE : "", ""]);
  }
  rows.push(["RAZEM", "", "", "", "", "", "", { f: `SUM(H12:H${11 + liczbaDni})` } as unknown as number]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [XLSX.utils.decode_range("A1:J1")];
  szerokosci(ws, [7, 14, 9, 11, 11, 11, 11, 13, 46, 18]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Karta czasu pracy");
  return wb;
}

function slug(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function pobierzKoordynacjePSF(spotkania: SpotkaniePSF[]) {
  XLSX.writeFile(skoroszytKoordynacjiPSF(spotkania), "Arkusz_koordynacji_spotkan.xlsx");
}

export function pobierzKartyCzasuPSF(spotkania: SpotkaniePSF[], rok: number, miesiac: number) {
  const doradcy = [...new Set(dniKartCzasuPSF(spotkania)
    .filter((d) => {
      const [r, m] = d.data.split("-").map(Number);
      return r === rok && m === miesiac + 1;
    })
    .map((d) => d.doradca))];
  for (const d of doradcy) {
    XLSX.writeFile(skoroszytKartyCzasuPSF(spotkania, d, rok, miesiac), `Karta_czasu_${slug(d)}_${MIESIACE[miesiac]}_${rok}.xlsx`);
  }
}
