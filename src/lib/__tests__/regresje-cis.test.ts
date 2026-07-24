import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PizZip from "pizzip";
import * as XLSX from "xlsx";

import { importujUczestnikow, normalizujDate, scalUczestnikow } from "../import-uczestnikow";
import { poprawBledneStatusy } from "../migracje-uczestnikow";
import { eksportujCSV, wierszSOWA } from "../sowa-eksport";
import { walidujUczestnika } from "../sowa-walidacja";
import { podzielL4 } from "../swiadczenia-l4";
import { NASTEPNY_ZNAK, ZNAKI_DO_WYBORU, kodObecnosci } from "../oznaczenia-obecnosci";
import type { Uczestnik } from "../types";
import { formatujDateDokumentu, formatujDateDokumentuKropki, formatujTelefon, polaUczestnika, wypelnijSzablon } from "../szablony";
import { specyfikacjaPSF, specyfikacjaSWA, unikalneProjekty } from "../projekty";
import { wymaganeDokumenty } from "../projekt-spec";
import { wyborDokumentowPoZmianieBazy } from "../wybor-dokumentow";
import {
  dniDoradcowPSF,
  dniKartCzasuPSF,
  dataStartowaHarmonogramuPSF,
  skoroszytKartyCzasuPSF,
  skoroszytKoordynacjiPSF,
  spotkaniaZFormularzyPSF,
} from "../psf-spotkania";
import { normalizujEmailZespolu, poprawnyEmailZespolu } from "../zespol-reguly";

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

async function tekstWygenerowanegoDocx(nazwa: string, u: Uczestnik): Promise<string> {
  const szablon = readFileSync(join(process.cwd(), "public", "wzory", nazwa));
  const blob = wypelnijSzablon(
    szablon.buffer.slice(szablon.byteOffset, szablon.byteOffset + szablon.byteLength),
    polaUczestnika(u, specyfikacjaSWA),
  );
  const zip = new PizZip(await blob.arrayBuffer());
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const WZORY_SWA = [
  "SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx",
  "SWA_A-02_Regulamin_rekrutacji_i_uczestnictwa_szablon.docx",
  "SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx",
  "SWA_B-02_Arkusz_Diagnozy_Kompleksowej_szablon.docx",
  "SWA_B-03_Wniosek_o_dostosowania_dla_ON_szablon.docx",
  "SWA_C-01_Lista_Obecnosci_szablon.docx",
  "SWA_C-05_Protokol_przekazania_smartfona_szablon.docx",
  "SWA_D-01_Arkusz_Walidacji_Ankieta_POST_szablon.docx",
  "SWA_D-02_Certyfikat_szablon.docx",
  "SWA_D-03_Ankieta_ewaluacyjna_trwalosc_szablon.docx",
  "SWA_F-01_Ankieta_kompetencji_PRE_szablon.docx",
  "SWA_G-04_Rozliczenie_kosztow_dojazdu_szablon.docx",
] as const;

describe("wybór osób do generowania dokumentów", () => {
  it("po wejściu lub zmianie bazy nie zaznacza automatycznie wszystkich osób", () => {
    const osoby = Array.from({ length: 27 }, (_, i) => ({ id: `u-${i + 1}` }));

    expect(wyborDokumentowPoZmianieBazy(osoby).size).toBe(0);
  });
});

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

describe("pola dokumentów SWA", () => {
  it("zaznacza checkboxy A-01 i odmienia dane umowy dla kobiety", () => {
    const u = uczestnik({
      imie: "Alicja",
      nazwisko: "Testowa",
      kategoria: "bierny",
      sciezka: "IPR",
      cykl: 1,
      sowa: {
        ...uczestnik().sowa,
        plec: "kobieta",
        statusRynkuPracy: "Osoba bierna zawodowo",
        wTymStatus: "Emeryt/rencista",
        wyksztalcenie: "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)",
        niepelnosprawnosc: "Nie",
      },
    });

    const pola = polaUczestnika(u, specyfikacjaSWA);
    expect(pola).toMatchObject({
      cb_kobieta: "☒",
      cb_mezczyzna: "☐",
      cb_swa_bierna: "☐",
      cb_swa_emeryt_rencista: "☒",
      cb_swa_wyk_podstawowe: "☒",
      cb_swa_wyk_gimnazjalne: "☐",
      cb_swa_niepelnosprawnosc_nie: "☒",
      cb_swa_niepelnosprawnosc_tak: "☐",
      cb_swa_cykl1: "☒",
      cb_swa_cykl2: "☐",
      forma_umowy: "Panią",
      zamieszkaly_umowa: "zamieszkałą",
      zwany_umowa: "zwaną dalej „Uczestniczką projektu”.",
      miejsce_umowy: "Świebodzinie",
    });
  });

  it("zaznacza pracującego mężczyznę z wyższym wykształceniem i ON", () => {
    const u = uczestnik({
      cykl: 2,
      sowa: {
        ...uczestnik().sowa,
        statusRynkuPracy: "Osoba pracująca",
        wyksztalcenie: "Wyższe (ISCED 5–8)",
        niepelnosprawnosc: "Tak — stopień umiarkowany",
      },
    });

    const pola = polaUczestnika(u, specyfikacjaSWA);
    expect(pola).toMatchObject({
      cb_kobieta: "☐",
      cb_mezczyzna: "☒",
      cb_swa_pracujaca: "☒",
      cb_swa_wyk_wyzsze: "☒",
      cb_swa_niepelnosprawnosc_nie: "☐",
      cb_swa_niepelnosprawnosc_tak: "☒",
      cb_swa_cykl1: "☐",
      cb_swa_cykl2: "☒",
      forma_umowy: "Panem",
      zamieszkaly_umowa: "zamieszkałym",
      zwany_umowa: "zwanym dalej „Uczestnikiem projektu”.",
    });
  });

  it("wstawia zaznaczenia do gotowego dokumentu A-01", async () => {
    const u = uczestnik({
      imie: "Alicja",
      nazwisko: "Testowa",
      kategoria: "bierny",
      sciezka: "IPR",
      cykl: 1,
      sowa: {
        ...uczestnik().sowa,
        plec: "kobieta",
        statusRynkuPracy: "Osoba bierna zawodowo",
        wTymStatus: "Emeryt/rencista",
        wyksztalcenie: "Podstawowe (ISCED 1) lub gimnazjalne (ISCED 2)",
        niepelnosprawnosc: "Nie",
      },
    });
    const tekst = await tekstWygenerowanegoDocx(
      "SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx",
      u,
    );

    expect(tekst).toContain("☒ Kobieta");
    expect(tekst).toContain("☐ Mężczyzna");
    expect(tekst).toContain("☒ Emeryt/rencista");
    expect(tekst).toContain("☒ Podstawowe");
    expect(tekst).toContain("☒ NIE – nie posiadam orzeczenia");
    expect(tekst).toContain("☒ Miasto");
    expect(tekst).toContain("☒ I cykl (2026)");
  });

  it("wypełnia datę i formy osobowe w gotowej umowie B-01", async () => {
    const u = uczestnik({
      imie: "Alicja",
      nazwisko: "Testowa",
      sowa: { ...uczestnik().sowa, plec: "kobieta" },
    });
    const tekst = await tekstWygenerowanegoDocx(
      "SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx",
      u,
    );

    expect(tekst).toContain("zawarta w dniu 01.07.2026 r. w Świebodzinie");
    expect(tekst).toContain("Panią: Alicja Testowa");
    expect(tekst).toContain("zamieszkałą:");
    expect(tekst).toContain("zwaną dalej „Uczestniczką projektu”.");
    expect(tekst).toContain("formularz SWA/C-05");
    expect(tekst).not.toContain("SWA/G-01");
  });

  it("generuje bez pozostawionych znaczników wszystkie 12 wzorów SWA", async () => {
    const u = uczestnik();
    for (const wzor of WZORY_SWA) {
      const tekst = await tekstWygenerowanegoDocx(wzor, u);
      expect(tekst, wzor).not.toMatch(/{{[^}]+}}/);
      expect(tekst.length, wzor).toBeGreaterThan(50);
    }
  });
});

describe("automatyczny harmonogram i karty PSF", () => {
  it("używa dokładnie tej samej daty i godzin co formularz PAK2", () => {
    const u = uczestnik({ grupa: "Pomost 9", dataPrzystapienia: "2026-07-08" });
    const pola = polaUczestnika(u, specyfikacjaPSF);
    const [spotkanie] = spotkaniaZFormularzyPSF([u]);

    expect(spotkanie).toMatchObject({
      uczestnikId: u.id,
      data: "2026-07-08",
      godzinaOd: pola.godzina_spotkania_od,
      godzinaDo: pola.godzina_spotkania_do,
      minuty: 60,
      doradca: "Doradca 1 — Korina Łukaszkiewicz",
    });
  });

  it("pomija rezerwowych i sumuje spotkania doradcy według dni", () => {
    const a = uczestnik({ id: "a", dataPrzystapienia: "2026-07-08" });
    const b = uczestnik({ id: "b", imie: "Anna", sowa: { ...uczestnik().sowa, pesel: "02070803628" }, dataPrzystapienia: "2026-07-08" });
    const rezerwowy = uczestnik({ id: "r", status: "rezerwowy" });
    const spotkania = spotkaniaZFormularzyPSF([a, b, rezerwowy]);

    expect(spotkania).toHaveLength(2);
    expect(dniDoradcowPSF(spotkania)).toEqual([
      expect.objectContaining({ data: "2026-07-08", liczbaSpotkan: 2, godziny: 2 }),
    ]);
  });

  it("buduje arkusz koordynacji i miesięczną kartę czasu w XLSX", () => {
    const spotkania = spotkaniaZFormularzyPSF([
      uczestnik({ id: "a", dataPrzystapienia: "2026-07-08" }),
    ]);
    const koord = skoroszytKoordynacjiPSF(spotkania).Sheets["Arkusz koordynacji"];
    const karta = skoroszytKartyCzasuPSF(spotkania, spotkania[0].doradca, 2026, 6)
      .Sheets["Karta czasu pracy"];

    expect(koord.A1.v).toBe("ARKUSZ KOORDYNACJI SPOTKAŃ DORADCZYCH");
    expect(koord.H5.v).toBe(60);
    expect(karta.B5.v).toContain("Moja ścieżka rozwoju");
    expect(karta.B7.v).toBe(1);
    expect(karta.H43.f).toBe("SUM(H12:H42)");
  });

  it("uwzględnia historyczne karty Doradcy 2 z Gorzowa bez danych osobowych", () => {
    const marzec = dniKartCzasuPSF([]).filter((d) => d.data.startsWith("2026-03"));
    const maj = dniKartCzasuPSF([]).filter((d) => d.data.startsWith("2026-05"));
    const lipiec = dniKartCzasuPSF([]).filter((d) => d.data.startsWith("2026-07"));

    expect(marzec.reduce((n, d) => n + d.godziny, 0)).toBe(10);
    expect(maj.reduce((n, d) => n + d.godziny, 0)).toBe(10);
    expect(lipiec.reduce((n, d) => n + d.godziny, 0)).toBe(7);
    expect(lipiec.every((d) => d.doradca === "Doradca 2 — Gorzów")).toBe(true);

    const karta = skoroszytKartyCzasuPSF([], "Doradca 2 — Gorzów", 2026, 6)
      .Sheets["Karta czasu pracy"];
    expect(karta.B4.v).toBe("");
    expect(karta.B7.v).toBe(7);
    expect(karta.D19.v).toBe("15:00");
    expect(karta.E19.v).toBe("16:00");
    expect(karta.D21.v).toBe("15:00");
    expect(karta.E21.v).toBe("21:00");
  });

  it("nie podwaja historycznej godziny Gorzowa po imporcie formularza", () => {
    const spotkania = [{
      id: "psf-auto:test",
      uczestnikId: "u-test",
      nrUczestnika: "001",
      uczestnik: "Osoba Testowa",
      grupa: "Gorzów lipiec",
      doradca: "Doradca 2 — Gorzów",
      data: "2026-07-08",
      godzinaOd: "15:00",
      godzinaDo: "16:00",
      minuty: 60,
      zadanie: "Doradztwo zawodowe i bilans kompetencji",
    }];
    const lipiec = dniKartCzasuPSF(spotkania).filter((d) => d.data.startsWith("2026-07"));
    expect(lipiec.reduce((n, d) => n + d.godziny, 0)).toBe(7);
  });

  it("otwiera harmonogram na ostatnim spotkaniu zamiast na pustym bieżącym tygodniu", () => {
    const spotkania = spotkaniaZFormularzyPSF([
      uczestnik({ id: "a", dataPrzystapienia: "2026-07-03" }),
      uczestnik({ id: "b", dataPrzystapienia: "2026-07-09" }),
    ]);
    expect(dataStartowaHarmonogramuPSF(spotkania, "2026-07-23")).toBe("2026-07-09");
    expect(dataStartowaHarmonogramuPSF(spotkania, "2026-06-01")).toBe("2026-07-03");
    expect(dataStartowaHarmonogramuPSF([], "2026-07-23")).toBeNull();
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

describe("dostep pracownikow", () => {
  it("pokazuje tylko jeden rekord dla wspolnego klucza projektu", () => {
    const pierwszy = { id: "cis-2026", nazwa: "CIS" };
    const powtorka = { id: "cis-2026", nazwa: "CIS kopia" };
    const drugi = { id: "swa-6.8", nazwa: "Smartfon" };

    expect(unikalneProjekty([pierwszy, powtorka, drugi])).toEqual([
      pierwszy,
      drugi,
    ]);
  });

  it("migracja scala projekty zespolu i wymusza unikalny klucz", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260724120000_e14_projekty_wspolne_bez_duplikatow.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("partition by klucz");
    expect(sql).toContain("delete from public.projekty");
    expect(sql).toContain("create unique index");
    expect(sql).toContain("public.projekty (klucz)");
  });

  it("akceptuje konto Google spoza domeny gmail i normalizuje adres", () => {
    expect(normalizujEmailZespolu("  Pracownik@Firma.PL ")).toBe(
      "pracownik@firma.pl",
    );
    expect(poprawnyEmailZespolu("pracownik@firma.pl")).toBe(true);
    expect(poprawnyEmailZespolu("brak-malpy.pl")).toBe(false);
  });

  it("migracja zamyka dostep do aktywnego zespolu i chroni administratora", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260723120000_e13_pracownicy_role.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("and z.aktywny");
    expect(sql).toContain("czy_administratorem");
    expect(sql).toContain("zespol_chron_ostatniego_admina");
    expect(sql).toContain("'uczestnicy','projekty','obecnosci'");
    expect(sql).toContain("drop policy if exists \"%s_wlasciciel_select\"");
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

describe("komunikaty interfejsu", () => {
  it("nie pokazuje nieaktualnej informacji o etapie E1", () => {
    const strona = readFileSync(
      join(process.cwd(), "src", "app", "uczestnicy", "page.tsx"),
      "utf8",
    );
    expect(strona).not.toContain("baza z logowaniem i historią zmian to etap E1");
    expect(strona).toContain("Brak uczestników w projekcie — zaimportuj bazę");
  });
});
