import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { importujUczestnikow, scalUczestnikow } from "../import-uczestnikow";
import { poprawBledneStatusy } from "../migracje-uczestnikow";
import { eksportujCSV, wierszSOWA } from "../sowa-eksport";
import { walidujUczestnika } from "../sowa-walidacja";
import { podzielL4 } from "../swiadczenia-l4";
import type { Uczestnik } from "../types";

function uczestnik(nadpisz: Partial<Uczestnik> = {}): Uczestnik {
  return {
    id: "u-1",
    imie: "Jan",
    nazwisko: "Kowalski",
    kategoria: "bezrobotny",
    sciezka: "IPZS",
    cykl: 1,
    grupa: "A",
    status: "aktywny",
    dataPrzystapienia: "2026-07-01",
    frekwencja: 75,
    posiadaneDokumenty: ["a-01"],
    etapSciezki: 2,
    postepSciezki: 60,
    sowa: {
      obywatelstwo: "Obywatelstwo polskie",
      rodzajUczestnika: "Indywidualny",
      pesel: "44051401458",
      brakPesel: "Nie",
      technicznyId: "TECH-1",
      plec: "mężczyzna",
      wiek: 82,
      wyksztalcenie: "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)",
      kraj: "Polska",
      wojewodztwo: "lubuskie",
      powiat: "świebodziński",
      gmina: "Świebodzin",
      miejscowosc: "Świebodzin",
      kodPocztowy: "66-200",
      degurba: "2",
      telefon: "600700800",
      email: "jan@example.org",
      statusRynkuPracy: "Osoba bezrobotna",
      wTymStatus: "Inne",
      zakresWsparcia: "Aktywizacja społeczna i zawodowa",
      rodzajWsparcia: "Wsparcie indywidualne",
      wTymWsparcia: "Indywidualny program zatrudnienia socjalnego",
      dataRozpoczeciaWsparcia: "2026-07-01",
      osobaObcegoPochodzenia: "Nie",
      obywatelPanstwaTrzeciego: "Nie",
      mniejszosc: "Nie",
      bezdomnosc: "Nie",
      niepelnosprawnosc: "Nie",
      uwagi: "test regresji",
    },
    ...nadpisz,
  };
}

async function importuj(wiersze: Record<string, unknown>[]) {
  const arkusz = XLSX.utils.json_to_sheet(wiersze);
  const skoroszyt = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(skoroszyt, arkusz, "Import");
  const bufor = XLSX.write(skoroszyt, { type: "array", bookType: "xlsx" });
  const plik = { arrayBuffer: async () => bufor } as File;
  return importujUczestnikow(plik, "cis-2026");
}

describe("import uczestników", () => {
  it("ustawia nową osobę bez daty zakończenia jako aktywną", async () => {
    const wynik = await importuj([{ Imię: "Anna", Nazwisko: "Nowak", PESEL: "44051401458" }]);
    expect(wynik.uczestnicy).toHaveLength(1);
    expect(wynik.uczestnicy[0].status).toBe("aktywny");
  });

  it("respektuje jawny status rezerwowy", async () => {
    const wynik = await importuj([{ Imię: "Anna", Nazwisko: "Nowak", "Status udziału": "rezerwowy" }]);
    expect(wynik.uczestnicy[0].status).toBe("rezerwowy");
  });

  it("scala przyrostowo bez usuwania osób i zachowuje dane operacyjne", () => {
    const stary = uczestnik({ id: "staly-id", utworzono: "2026-06-01T10:00:00Z" });
    const druga = uczestnik({ id: "u-2", imie: "Ewa", nazwisko: "Lis", sowa: { pesel: "02070803628" } });
    const aktualizacja = uczestnik({ id: "import-id", nazwisko: "Kowalski-Nowy", frekwencja: 0, posiadaneDokumenty: [] });
    const nowa = uczestnik({ id: "u-3", imie: "Ola", nazwisko: "Kot", sowa: { pesel: "02070812348" } });

    const wynik = scalUczestnikow([stary, druga], [aktualizacja, nowa]);
    expect(wynik.uczestnicy).toHaveLength(3);
    expect(wynik.dodano).toBe(1);
    expect(wynik.zaktualizowano).toBe(1);
    expect(wynik.uczestnicy.find((u) => u.id === "u-2")).toBeDefined();
    const zaktualizowany = wynik.uczestnicy.find((u) => u.id === "staly-id");
    expect(zaktualizowany).toMatchObject({ nazwisko: "Kowalski-Nowy", frekwencja: 75, posiadaneDokumenty: ["a-01"], etapSciezki: 2, postepSciezki: 60 });
  });
});

describe("format SOWA", () => {
  it("eksportuje dokładnie 43 kolumny oraz komplet kluczowych pól", () => {
    const u = uczestnik();
    const wiersz = wierszSOWA(u, { numerProjektu: "FELB.06.11-IZ.00-0001/26" });
    expect(wiersz).toHaveLength(43);
    expect(wiersz[0]).toBe("FELB.06.11-IZ.00-0001/26");
    expect(wiersz[2]).toBe("Indywidualny");
    expect(wiersz[6]).toBe("44051401458");
    expect(wiersz[28]).toBe("Aktywizacja społeczna i zawodowa");
    expect(wiersz[31]).toBe("2026-07-01");
    expect(wiersz.slice(33, 38)).toEqual(["Nie", "Nie", "Nie", "Nie", "Nie"]);
    expect(wiersz[42]).toBe("test regresji");

    const [naglowek, dane] = eksportujCSV([u], { numerProjektu: "P-1" }).trim().split("\r\n");
    expect(naglowek.split(";")).toHaveLength(43);
    expect(dane.split(";")).toHaveLength(43);
  });

  it("pełny formularz przechodzi walidację bez błędów", () => {
    expect(walidujUczestnika(uczestnik()).filter((p) => p.poziom === "blad")).toEqual([]);
  });

  it("wykrywa brak wymaganych danych wsparcia", () => {
    const u = uczestnik({ sowa: { ...uczestnik().sowa, zakresWsparcia: undefined, rodzajWsparcia: undefined, wTymWsparcia: undefined, dataRozpoczeciaWsparcia: undefined } });
    const pola = walidujUczestnika(u).filter((p) => p.poziom === "blad").map((p) => p.pole);
    expect(pola).toEqual(expect.arrayContaining(["Zakres wsparcia", "Rodzaj wsparcia", "W tym — wsparcia", "Data rozpoczęcia wsparcia"]));
  });
});

describe("statusy i świadczenia", () => {
  it("naprawia wyłącznie stare błędne statusy rezerwowe projektu CIS", () => {
    const stary = uczestnik({ id: "stary", status: "rezerwowy", utworzono: "2026-07-15T12:00:00Z" });
    const nowy = uczestnik({ id: "nowy", status: "rezerwowy", utworzono: "2026-07-15T13:00:00Z" });
    const wynik = poprawBledneStatusy("cis-2026", [stary, nowy]);
    expect(wynik.poprawioneId).toEqual(["stary"]);
    expect(wynik.uczestnicy.map((u) => u.status)).toEqual(["aktywny", "rezerwowy"]);
    expect(poprawBledneStatusy("inny-projekt", [stary]).uczestnicy[0].status).toBe("rezerwowy");
  });

  it("dzieli L4 narastająco na dni do 21 i powyżej limitu", () => {
    const wpisy = [
      ...Array.from({ length: 20 }, (_, i) => ({ data: `2026-06-${String(i + 1).padStart(2, "0")}`, znak: "l" })),
      ...["01", "02", "03", "04"].map((d) => ({ data: `2026-07-${d}`, znak: "l" })),
      { data: "2026-07-05", znak: "p" },
      { data: "2026-08-01", znak: "l" },
    ];
    expect(podzielL4(wpisy, "2026-07-01", "2026-07-31")).toEqual({
      l4WMiesiacu: 4,
      l4Do21: 1,
      l4Ponad21: 3,
      l4LacznieDoKoncaMiesiaca: 24,
    });
  });
});
