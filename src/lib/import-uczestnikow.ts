// Import bazy uczestników z pliku Excel (.xlsx) lub CSV w strukturze SOWA EFS
// (kolumny jak w pliku "Import" / "Uczestnicy_projektu_Efs" / CIS_uczestnicy.xlsx).
// Parsowanie w przeglądarce (SheetJS) — plik nie opuszcza komputera użytkownika.

import * as XLSX from "xlsx";
import type {
  DaneSOWA,
  KategoriaUczestnika,
  StatusUdzialu,
  Uczestnik,
} from "./types";

/** normalizacja nagłówka: małe litery, bez polskich znaków i interpunkcji */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function znajdz(wiersz: Record<string, unknown>, ...frazy: string[]): string {
  for (const [k, v] of Object.entries(wiersz)) {
    const nk = norm(k);
    if (frazy.every((f) => nk.includes(f))) {
      const s = String(v ?? "").trim();
      if (s !== "") return s;
    }
  }
  return "";
}

function kategoriaZeStatusu(status: string): KategoriaUczestnika {
  return norm(status).includes("biern") ? "bierny" : "bezrobotny";
}

function znajdzDokladnie(
  wiersz: Record<string, unknown>,
  naglowek: string,
): string {
  const cel = norm(naglowek);
  for (const [k, v] of Object.entries(wiersz)) {
    if (norm(k) === cel) return String(v ?? "").trim();
  }
  return "";
}

function pierwszaNiepusta(
  wiersz: Record<string, unknown>,
  warianty: string[][],
): string {
  for (const frazy of warianty) {
    const wartosc = znajdz(wiersz, ...frazy);
    if (wartosc) return wartosc;
  }
  return "";
}

function statusUdzialu(
  wiersz: Record<string, unknown>,
  dataZakonczenia: string,
): StatusUdzialu {
  const jawny = norm(
    pierwszaNiepusta(wiersz, [
      ["status", "udzialu"],
      ["status", "uczestnika"],
      ["status", "w projekcie"],
    ]),
  );
  if (jawny.includes("rezerw")) return "rezerwowy";
  if (jawny.includes("przerw") || jawny.includes("rezygn")) return "przerwał";
  if (jawny.includes("zakoncz")) return "zakończył";
  if (jawny.includes("aktyw")) return "aktywny";
  if (dataZakonczenia) return "zakończył";
  return "aktywny";
}

function daneNiepuste<T extends object>(dane: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dane).filter(([, v]) => v !== undefined && v !== ""),
  ) as Partial<T>;
}

/** Stabilny klucz do rozpoznawania tej samej osoby przy imporcie przyrostowym. */
export function kluczUczestnika(u: Uczestnik): string {
  const pesel = String(u.sowa?.pesel ?? "").replace(/\D/g, "");
  if (pesel.length === 11) return `pesel:${pesel}`;
  const osoba = norm(`${u.imie} ${u.nazwisko}`);
  const dataUrodzenia = u.sowa?.dataUrodzenia ?? "";
  return `osoba:${osoba}:${dataUrodzenia}`;
}

export interface WynikScalania {
  uczestnicy: Uczestnik[];
  dodano: number;
  zaktualizowano: number;
}

/** Scala import z obecną bazą bez usuwania osób nieobecnych w nowym pliku. */
export function scalUczestnikow(
  obecni: Uczestnik[],
  importowani: Uczestnik[],
): WynikScalania {
  const wynik = [...obecni];
  const indeks = new Map(wynik.map((u, i) => [kluczUczestnika(u), i]));
  let dodano = 0;
  let zaktualizowano = 0;

  for (const nowy of importowani) {
    const klucz = kluczUczestnika(nowy);
    const pozycja = indeks.get(klucz);
    if (pozycja === undefined) {
      indeks.set(klucz, wynik.length);
      wynik.push(nowy);
      dodano += 1;
      continue;
    }

    const stary = wynik[pozycja];
    const status =
      nowy.status === "zakończył" || nowy.status === "przerwał"
        ? nowy.status
        : stary.status === "rezerwowy" && nowy.status === "aktywny"
          ? "aktywny"
          : stary.status;
    wynik[pozycja] = {
      ...nowy,
      id: stary.id,
      utworzono: stary.utworzono,
      status,
      dataPrzystapienia:
        nowy.dataPrzystapienia !== "—"
          ? nowy.dataPrzystapienia
          : stary.dataPrzystapienia,
      frekwencja: stary.frekwencja,
      posiadaneDokumenty: stary.posiadaneDokumenty,
      etapSciezki: stary.etapSciezki,
      postepSciezki: stary.postepSciezki,
      sowa: {
        ...(stary.sowa ?? {}),
        ...daneNiepuste(nowy.sowa ?? {}),
      },
    };
    zaktualizowano += 1;
  }

  return { uczestnicy: wynik, dodano, zaktualizowano };
}

export interface WynikImportu {
  uczestnicy: Uczestnik[];
  pominieto: number;
  uwagi: string[];
  dodano?: number;
  zaktualizowano?: number;
  lacznie?: number;
}

export async function importujUczestnikow(
  file: File,
  prefixId: string,
): Promise<WynikImportu> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: false, codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const wiersze = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  const uwagi: string[] = [];
  const uczestnicy: Uczestnik[] = [];
  let pominieto = 0;

  wiersze.forEach((w, i) => {
    const imie = znajdz(w, "imie");
    const nazwisko = znajdz(w, "nazwisko");
    if (!imie || !nazwisko) {
      pominieto += 1;
      return;
    }
    const status = znajdz(w, "status", "rynku pracy");
    const dataRozp = pierwszaNiepusta(w, [
      ["data", "rozpoczecia"],
      ["data", "przystapienia"],
    ]);
    const dataZak = pierwszaNiepusta(w, [
      ["data", "zakonczenia"],
      ["data", "zakonczenia", "udzialu"],
    ]);
    const kategoria = kategoriaZeStatusu(status);

    const sowa: DaneSOWA = {
      obywatelstwo: znajdz(w, "obywatelstwo") || undefined,
      rodzajUczestnika: (znajdz(w, "rodzaj uczestnika") ||
        undefined) as DaneSOWA["rodzajUczestnika"],
      nazwaInstytucji: znajdz(w, "nazwa instytucji") || undefined,
      pesel: znajdz(w, "pesel") || undefined,
      brakPesel: (znajdz(w, "brak pesel") ||
        undefined) as DaneSOWA["brakPesel"],
      technicznyId: znajdz(w, "techniczny identyfikator") || undefined,
      plec: norm(znajdz(w, "plec")).startsWith("k")
        ? "kobieta"
        : norm(znajdz(w, "plec")).startsWith("m")
          ? "mężczyzna"
          : undefined,
      wiek: Number(znajdz(w, "wiek")) || undefined,
      wyksztalcenie: znajdz(w, "wyksztalcenie") || undefined,
      kraj: znajdz(w, "kraj") || undefined,
      wojewodztwo: znajdz(w, "wojewodztwo") || undefined,
      powiat: znajdz(w, "powiat") || undefined,
      gmina: znajdz(w, "gmina") || undefined,
      miejscowosc: znajdz(w, "miejscowosc") || undefined,
      ulica: znajdz(w, "ulica") || undefined,
      nrDomu: znajdz(w, "nr domu") || undefined,
      nrLokalu: znajdz(w, "nr lokalu") || undefined,
      kodPocztowy: znajdz(w, "kod pocztowy") || undefined,
      degurba: (znajdz(w, "degurba").match(/[123]/)?.[0] ?? undefined) as
        | DaneSOWA["degurba"],
      telefon: znajdz(w, "telefon") || undefined,
      email: znajdz(w, "mail") || undefined,
      statusRynkuPracy: status || undefined,
      wTymStatus: znajdzDokladnie(w, "w tym") || undefined,
      dataZakonczeniaUdzialu: dataZak || undefined,
      planowanaDataZakonczeniaEdukacji:
        znajdz(w, "planowana", "zakonczenia edukacji") || undefined,
      sytuacjaPoZakonczeniu:
        znajdz(w, "sytuacja", "po zakonczeniu") || undefined,
      zakonczenieZgodneZeSciezka:
        znajdz(w, "zakonczenie", "zgodne", "sciezka") || undefined,
      zakresWsparcia: znajdz(w, "zakres wsparcia") || undefined,
      rodzajWsparcia:
        znajdz(w, "rodzaj", "przyznanego wsparcia") || undefined,
      wTymWsparcia:
        znajdzDokladnie(w, "w tym_1") ||
        znajdzDokladnie(w, "w tym 1") ||
        undefined,
      dataRozpoczeciaWsparcia:
        znajdz(w, "data", "rozpoczecia", "wsparciu") || undefined,
      dataZalozeniaDG: znajdz(w, "data", "zalozenia dg") || undefined,
      osobaObcegoPochodzenia:
        (znajdz(w, "osoba", "obcego pochodzenia") ||
          undefined) as DaneSOWA["osobaObcegoPochodzenia"],
      obywatelPanstwaTrzeciego:
        (znajdz(w, "obywatel", "panstwa trzeciego") ||
          undefined) as DaneSOWA["obywatelPanstwaTrzeciego"],
      mniejszosc: (znajdz(w, "mniejszosc") ||
        undefined) as DaneSOWA["mniejszosc"],
      bezdomnosc: (znajdz(w, "bezdomnosc") ||
        undefined) as DaneSOWA["bezdomnosc"],
      niepelnosprawnosc: znajdz(w, "niepelnosprawnosc") || undefined,
      uwagi: znajdz(w, "uwagi") || undefined,
    };

    uczestnicy.push({
      id: `${prefixId}-imp-${String(i + 1).padStart(3, "0")}`,
      imie,
      nazwisko,
      kategoria,
      sciezka: kategoria === "bezrobotny" ? "IPZS" : "IPR",
      cykl: 1,
      grupa: "—",
      status: statusUdzialu(w, dataZak),
      dataPrzystapienia: dataRozp || "—",
      frekwencja: 0,
      posiadaneDokumenty: [],
      etapSciezki: dataZak ? 3 : dataRozp ? 2 : 0,
      postepSciezki: dataZak ? 100 : dataRozp ? 50 : 0,
      sowa,
    });
  });

  if (pominieto > 0)
    uwagi.push(`Pominięto ${pominieto} wierszy bez imienia/nazwiska.`);
  if (uczestnicy.length === 0)
    uwagi.push(
      "Nie rozpoznano uczestników — sprawdź, czy pierwszy arkusz ma nagłówki SOWA (Imię, Nazwisko, ...).",
    );

  return { uczestnicy, pominieto, uwagi };
}
