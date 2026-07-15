// Eksport bazy uczestników do pliku CSV w formacie „Import” SOWA EFS:
// 43 kolumny, separator średnik, kodowanie UTF-8 z BOM, daty yyyy-MM-dd.
// Wartości słownikowe mapowane zgodnie z regułami walidatora (sowa-walidacja).

import type { Uczestnik } from "./types";
import {
  mapujStatus,
  mapujWyksztalcenie,
  wTymDlaStatusu,
} from "./sowa-walidacja";

/** Nagłówki 43 kolumn pliku Import (indeksy 0–42). */
const NAGLOWKI = [
  "Numer projektu",
  "Obywatelstwo",
  "Rodzaj uczestnika",
  "Nazwa instytucji",
  "Imię",
  "Nazwisko",
  "PESEL/Inny identyfikator",
  "brak PESEL",
  "Techniczny identyfikator",
  "Płeć",
  "Wiek",
  "Wykształcenie",
  "Kraj",
  "Województwo",
  "Powiat",
  "Gmina",
  "Miejscowość",
  "Kod pocztowy",
  "DEGURBA",
  "Telefon kontaktowy",
  "Adres e-mail",
  "Data rozpoczęcia udziału w projekcie",
  "Data zakończenia udziału w projekcie",
  "Status osoby na rynku pracy",
  "w tym",
  "Planowana data zakończenia edukacji",
  "Sytuacja po zakończeniu",
  "Zakończenie zgodne ze ścieżką",
  "Zakres wsparcia",
  "Rodzaj przyznanego wsparcia",
  "w tym ",
  "Data rozpoczęcia udziału we wsparciu",
  "Data założenia DG",
  "Osoba obcego pochodzenia",
  "Obywatel państwa trzeciego",
  "Mniejszość",
  "Bezdomność",
  "Niepełnosprawność",
  "Data dodania",
  "Użytkownik dodający",
  "Data modyfikacji",
  "Użytkownik modyfikujący",
  "Uwagi",
];

export interface OpcjeEksportu {
  /** np. „FELB.06.11-IZ.00-001/26” */
  numerProjektu: string;
  /** wartość słownikowa pola „Zakres wsparcia” — skopiuj z eksportu systemowego naboru */
  zakresWsparcia?: string;
  /** wartość słownikowa pola „Rodzaj przyznanego wsparcia” */
  rodzajWsparcia?: string;
  /** wartość pola „w tym” dla wsparcia */
  wTymWsparcia?: string;
}

function pole(v: string): string {
  // średnik lub cudzysłów w wartości → pole w cudzysłowie
  if (v.includes(";") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function data(v?: string): string {
  return v && v !== "—" ? v : "";
}

export function wierszSOWA(u: Uczestnik, o: OpcjeEksportu): string[] {
  const s = u.sowa;
  const obywatelstwo = s?.obywatelstwo
    ? s.obywatelstwo.toLowerCase().includes("pol")
      ? "Obywatelstwo polskie"
      : s.obywatelstwo
    : "";
  const statusSowa = s?.statusRynkuPracy
    ? (mapujStatus(s.statusRynkuPracy) ?? s.statusRynkuPracy)
    : "";
  const wyksztalcenie = s?.wyksztalcenie
    ? (mapujWyksztalcenie(s.wyksztalcenie) ?? s.wyksztalcenie)
    : "";
  const plec = s?.plec
    ? s.plec === "kobieta"
      ? "Kobieta"
      : "Mężczyzna"
    : "";

  const w = new Array<string>(NAGLOWKI.length).fill("");
  w[0] = o.numerProjektu;
  w[1] = obywatelstwo;
  w[2] = s?.rodzajUczestnika ?? "Indywidualny";
  w[3] = s?.nazwaInstytucji ?? "";
  w[4] = u.imie;
  w[5] = u.nazwisko;
  w[6] = s?.pesel ?? "";
  w[7] = s?.brakPesel ?? (s?.pesel ? "Nie" : "Tak");
  w[8] = s?.technicznyId ?? "";
  w[9] = plec;
  w[10] = s?.wiek ? String(s.wiek) : "";
  w[11] = wyksztalcenie;
  w[12] = s?.kraj ?? "";
  w[13] = s?.wojewodztwo ?? "";
  w[14] = s?.powiat ?? "";
  w[15] = s?.gmina ?? "";
  w[16] = s?.miejscowosc ?? "";
  w[17] = s?.kodPocztowy ?? "";
  w[18] = s?.degurba ?? "";
  w[19] = s?.telefon ?? "";
  w[20] = s?.email ?? "";
  w[21] = data(u.dataPrzystapienia);
  w[22] = data(s?.dataZakonczeniaUdzialu);
  w[23] = statusSowa;
  w[24] = s?.wTymStatus ?? wTymDlaStatusu(statusSowa);
  w[25] = data(s?.planowanaDataZakonczeniaEdukacji);
  w[26] = s?.sytuacjaPoZakonczeniu ?? "";
  w[27] = s?.zakonczenieZgodneZeSciezka ?? "";
  w[28] = s?.zakresWsparcia ?? o.zakresWsparcia ?? "";
  w[29] = s?.rodzajWsparcia ?? o.rodzajWsparcia ?? "";
  w[30] = s?.wTymWsparcia ?? o.wTymWsparcia ?? "";
  w[31] = data(s?.dataRozpoczeciaWsparcia ?? u.dataPrzystapienia);
  w[32] = data(s?.dataZalozeniaDG);
  w[33] = s?.osobaObcegoPochodzenia ?? "Nie";
  w[34] = s?.obywatelPanstwaTrzeciego ?? "Nie";
  w[35] = s?.mniejszosc ?? "Nie";
  w[36] = s?.bezdomnosc ?? "Nie";
  w[37] = s?.niepelnosprawnosc ?? "Nie";
  w[42] = s?.uwagi ?? "";
  return w;
}

/** Buduje treść pliku CSV (UTF-8 BOM dodawany przy pobieraniu). */
export function eksportujCSV(
  uczestnicy: Uczestnik[],
  o: OpcjeEksportu,
): string {
  const linie = [
    NAGLOWKI.map(pole).join(";"),
    ...uczestnicy.map((u) => wierszSOWA(u, o).map(pole).join(";")),
  ];
  return linie.join("\r\n") + "\r\n";
}

/** Pobranie pliku w przeglądarce (UTF-8 z BOM — wymóg SOWA). */
export function pobierzCSV(nazwaPliku: string, tresc: string): void {
  const blob = new Blob(["\uFEFF" + tresc], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  URL.revokeObjectURL(url);
}
