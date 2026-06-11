// Import bazy uczestników z pliku Excel (.xlsx) lub CSV w strukturze SOWA EFS
// (kolumny jak w pliku "Import" / "Uczestnicy_projektu_Efs" / CIS_uczestnicy.xlsx).
// Parsowanie w przeglądarce (SheetJS) — plik nie opuszcza komputera użytkownika.

import * as XLSX from "xlsx";
import type { DaneSOWA, KategoriaUczestnika, Uczestnik } from "./types";

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

export interface WynikImportu {
  uczestnicy: Uczestnik[];
  pominieto: number;
  uwagi: string[];
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
    const dataRozp = znajdz(w, "data rozpoczecia");
    const dataZak = znajdz(w, "data zakonczenia");
    const kategoria = kategoriaZeStatusu(status);

    const sowa: DaneSOWA = {
      obywatelstwo: znajdz(w, "obywatelstwo") || undefined,
      pesel: znajdz(w, "pesel") || undefined,
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
      kodPocztowy: znajdz(w, "kod pocztowy") || undefined,
      degurba: (znajdz(w, "degurba").match(/[123]/)?.[0] ?? undefined) as
        | DaneSOWA["degurba"],
      telefon: znajdz(w, "telefon") || undefined,
      email: znajdz(w, "mail") || undefined,
      statusRynkuPracy: status || undefined,
    };

    uczestnicy.push({
      id: `${prefixId}-imp-${String(i + 1).padStart(3, "0")}`,
      imie,
      nazwisko,
      kategoria,
      sciezka: kategoria === "bezrobotny" ? "IPZS" : "IPR",
      cykl: 1,
      grupa: "—",
      status: dataZak ? "zakończył" : dataRozp ? "aktywny" : "rezerwowy",
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
