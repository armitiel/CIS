import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { importujUczestnikow, normalizujDate, scalUczestnikow } from "../import-uczestnikow";
import { poprawBledneStatusy } from "../migracje-uczestnikow";
import { eksportujCSV, wierszSOWA } from "../sowa-eksport";
import { walidujUczestnika } from "../sowa-walidacja";
import { podzielL4 } from "../swiadczenia-l4";
import { NASTEPNY_ZNAK, ZNAKI_DO_WYBORU, kodObecnosci } from "../oznaczenia-obecnosci";
import type { Uczestnik } from "../types";
import { formatujDateDokumentu, formatujDateDokumentuKropki, formatujTelefon, polaUczestnika } from "../szablony";
import { specyfikacjaPSF } from "../projekty";
import { wymaganeDokumenty } from "../projekt-spec";

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
  it("zamienia numer seryjny Excela na datę ISO", () => {
    expect(normalizujDate(46211)).toBe("2026-07-08");
    expect(normalizujDate("08/07/2026")).toBe("2026-07-08");
  });

  it("normalizuje daty z pełnego rekordu SOWA", async () => {
    const wynik = await importuj([{
      Imię: "Anna",
      Nazwisko: "Nowak",
      PESEL: "44051401458",
      "Data rozpoczęcia udziału w projekcie": 46211,
      "Data rozpoczęcia udziału we wsparciu": 46211,
    }]);
    expect(wynik.uczestnicy[0].dataPrzystapienia).toBe("2026-07-08");
    expect(wynik.uczestnicy[0].sowa?.dataRozpoczeciaWsparcia).toBe("2026-07-08");
  });
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

describe("pola dokumentów PSF", () => {
  it("używa daty przystąpienia zamiast daty uruchomienia generatora", () => {
    expect(formatujDateDokumentu("2026-07-08")).toBe("08/07/2026");
    expect(formatujDateDokumentuKropki("2026-07-08")).toBe("08.07.2026");
    expect(formatujDateDokumentu("46211")).toBe("……………………");
  });

  it("formatuje polski numer telefonu", () => {
    expect(formatujTelefon("48600100200")).toBe("+48 600 100 200");
  });

  it("mapuje zbiorczą kategorię ISCED 0–2 do pola ISCED 2 bez zaznaczania ISCED 0", () => {
    const u = uczestnik({
      kategoria: "bierny",
      sciezka: "IPR",
      sowa: {
        ...uczestnik().sowa,
        wyksztalcenie: "Średnie I stopnia lub niższe (ISCED 0–2)",
      },
    });
    const pola = polaUczestnika(u, specyfikacjaPSF);
    expect(pola.cb_isced0).toBe("☐");
    expect(pola.cb_isced2).toBe("☒");
    expect(pola.data_dokumentu).toBe("01/07/2026");
    expect(pola.nr_umowy).toMatch(/^\d{3}\/FELB\.06\.08\/2026$/);
    expect(pola.godzina_spotkania_od).toMatch(/^\d{2}:00$/);
    expect(pola.godzina_spotkania_do).toMatch(/^\d{2}:00$/);
    expect(polaUczestnika(u, specyfikacjaPSF).nr_umowy).toBe(pola.nr_umowy);
  });

  it("generuje pełny komplet ośmiu formularzy PSF także dla osoby aktywnej", () => {
    expect(wymaganeDokumenty(uczestnik(), specyfikacjaPSF).map((d) => d.symbol))
      .toEqual(["PAK1", "E1", "A3", "PAK2", "B", "C1", "PAK3", "F1"]);
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
  it("naprawia stare błędne statusy rezerwowe CIS i PSF, gdy osoba już przystąpiła", () => {
    const stary = uczestnik({ id: "stary", status: "rezerwowy", utworzono: "2026-07-15T12:00:00Z" });
    const nowy = uczestnik({ id: "nowy", status: "rezerwowy", utworzono: "2026-07-15T13:00:00Z" });
    const prawdziwaRezerwa = uczestnik({ id: "rezerwa", status: "rezerwowy", dataPrzystapienia: "—", utworzono: "2026-07-15T12:00:00Z" });
    const wynik = poprawBledneStatusy("cis-2026", [stary, nowy]);
    expect(wynik.poprawioneId).toEqual(["stary"]);
    expect(wynik.uczestnicy.map((u) => u.status)).toEqual(["aktywny", "rezerwowy"]);
    expect(poprawBledneStatusy("psf-sciezka", [stary]).uczestnicy[0].status).toBe("aktywny");
    expect(poprawBledneStatusy("psf-sciezka", [prawdziwaRezerwa]).uczestnicy[0].status).toBe("rezerwowy");
    expect(poprawBledneStatusy("inny-projekt", [stary]).uczestnicy[0].status).toBe("rezerwowy");
  });

  it("naprawia numery seryjne Excela zapisane wcześniej w bazie", () => {
    const stary = uczestnik({
      dataPrzystapienia: "46211",
      sowa: { ...uczestnik().sowa, dataRozpoczeciaWsparcia: "46211" },
    });
    const wynik = poprawBledneStatusy("psf-sciezka", [stary]);
    expect(wynik.poprawioneId).toEqual(["u-1"]);
    expect(wynik.uczestnicy[0].dataPrzystapienia).toBe("2026-07-08");
    expect(wynik.uczestnicy[0].sowa?.dataRozpoczeciaWsparcia).toBe("2026-07-08");
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

  it("udostępnia dwa osobne oznaczenia L4 i zachowuje je w dokumentach", () => {
    expect(ZNAKI_DO_WYBORU).toEqual(["p", "a", "l21", "l22", "w"]);
    expect(NASTEPNY_ZNAK.a).toBe("l21");
    expect(NASTEPNY_ZNAK.l21).toBe("l22");
    expect(kodObecnosci("l21")).toBe("L4≤21");
    expect(kodObecnosci("l22")).toBe("L4>21");
  });

  it("respektuje ręcznie wskazane L4 do i powyżej 21 dni", () => {
    const wpisy = [
      { data: "2026-07-01", znak: "l21" },
      { data: "2026-07-02", znak: "l21" },
      { data: "2026-07-03", znak: "l22" },
      { data: "2026-07-04", znak: "l22" },
    ];
    expect(podzielL4(wpisy, "2026-07-01", "2026-07-31")).toEqual({
      l4WMiesiacu: 4,
      l4Do21: 2,
      l4Ponad21: 2,
      l4LacznieDoKoncaMiesiaca: 4,
    });
  });
});
