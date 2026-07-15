// Generator dokumentów .docx — działa w przeglądarce (etap E5).
// Dane zawsze z kartoteki uczestnika (struktura SOWA) — jedno źródło prawdy.
// Treści formularzy odzwierciedlają katalog A–H i zasady z Analizy optymalizacji v3.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import JSZip from "jszip";
import type { Uczestnik } from "./types";
import {
  specyfikacjaCIS,
  type SpecyfikacjaProjektu,
  type WymaganyDokument,
} from "./projekt-spec";
import { trescRealna } from "./tresci-realne";
import { polaUczestnika, wypelnijSzablon } from "./szablony";
import { wzorDlaDokumentu } from "./wzory";
import type { KodObecnosci } from "./oznaczenia-obecnosci";

type Blok = Paragraph | Table;

const dzis = () =>
  new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const linia = "…………………………………………………………………";

function naglowekProjektu(
  spec: SpecyfikacjaProjektu,
  symbol?: string,
): Paragraph[] {
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      spacing: { after: 60 },
      children: [
        new TextRun({ text: spec.wnioskodawca, bold: true, size: 22 }),
        new TextRun({ text: symbol ? `\t${symbol}` : "", size: 20, color: "555555" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: `Projekt: ${spec.nazwa}`, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Nabór: ${spec.nabor} · Okres realizacji: ${spec.okres}`,
          size: 18,
          color: "555555",
        }),
      ],
    }),
  ];
}

function tytul(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function pole(label: string, value?: string | number): Paragraph {
  return new Paragraph({
    spacing: { after: 110 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({
        text:
          value !== undefined && String(value).trim() !== ""
            ? String(value)
            : linia,
      }),
    ],
  });
}

function akapit(text: string, italics = false): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, italics, color: italics ? "777777" : undefined })],
  });
}

function podpisy(lewy: string, prawy: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 500 }, children: [] }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      children: [new TextRun("………………………………………"), new TextRun("\t………………………………………")],
    }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      children: [
        new TextRun({ text: lewy, size: 18, color: "555555" }),
        new TextRun({ text: `\t${prawy}`, size: 18, color: "555555" }),
      ],
    }),
  ];
}

function daneSOWA(u: Uczestnik, pelne = true): Paragraph[] {
  const s = u.sowa ?? {};
  const out: Paragraph[] = [
    pole("Imię i nazwisko", `${u.imie} ${u.nazwisko}`),
    pole("PESEL", s.pesel),
    pole("Płeć", s.plec),
    pole("Wiek w chwili przystąpienia", s.wiek),
    pole("Wykształcenie (ISCED)", s.wyksztalcenie),
  ];
  if (pelne) {
    out.push(
      pole("Obywatelstwo", s.obywatelstwo),
      pole(
        "Adres",
        s.miejscowosc
          ? `${s.miejscowosc}, gm. ${s.gmina ?? ""}, pow. ${s.powiat ?? ""}, woj. ${s.wojewodztwo ?? ""}, ${s.kodPocztowy ?? ""}`
          : undefined,
      ),
      pole("Obszar wg DEGURBA", s.degurba),
      pole("Telefon", s.telefon),
      pole("Adres e-mail", s.email),
      pole("Status na rynku pracy", s.statusRynkuPracy),
    );
  }
  out.push(
    pole(
      "Kategoria w projekcie",
      u.kategoria === "bezrobotny"
        ? "osoba bezrobotna — uczestnik CIS (ścieżka IPZS)"
        : "osoba bierna zawodowo (ścieżka IPR)",
    ),
    pole("Cykl / grupa", `${u.cykl} / ${u.grupa}`),
    pole(
      "Data rozpoczęcia udziału",
      u.dataPrzystapienia === "—" ? "(lista rezerwowa)" : u.dataPrzystapienia,
    ),
  );
  return out;
}

function trescDokumentu(
  d: WymaganyDokument,
  u: Uczestnik,
  spec: SpecyfikacjaProjektu,
): Blok[] {
  // Realne treści wzorów (Formularze_projektowe) — pierwszeństwo przed wersją ogólną
  const realna = trescRealna(d, u, spec);
  if (realna) return realna;

  const base = naglowekProjektu(spec, d.symbol);
  switch (d.id) {
    case "a-01":
      return [
        ...base,
        tytul("PAKIET ZGŁOSZENIOWY UCZESTNIKA"),
        akapit("Część I. Dane uczestnika (zgodne ze słownikami SOWA EFS)"),
        ...daneSOWA(u),
        akapit("Część II. Oświadczenia i zgody", false),
        akapit(
          "1) Oświadczam, że spełniam kryteria kwalifikowalności do udziału w projekcie. 2) Deklaruję udział w projekcie i aktywne uczestnictwo w formach wsparcia wynikających z IŚR. 3) Zapoznałem/-am się z klauzulą informacyjną RODO (FEWL 2021–2027). 4) Wyrażam zgodę na przetwarzanie danych szczególnej kategorii w zakresie niezbędnym do realizacji projektu. 5) Przesłanki premiujące — zgodnie z sekcją F pakietu.",
        ),
        akapit(
          "Zasada „jeden pakiet — jeden podpis”: podpis złożony poniżej potwierdza wszystkie oświadczenia zawarte w pakiecie (K1, K2).",
          true,
        ),
        ...podpisy("data i podpis kandydata/kandydatki", "podpis osoby przyjmującej"),
      ];
    case "b-01":
      return [
        ...base,
        tytul("UMOWA UCZESTNICTWA W PROJEKCIE"),
        ...daneSOWA(u, false),
        akapit(
          `§1. Przedmiotem umowy jest udział w projekcie „${spec.nazwa}”. §2. Uczestnik zobowiązuje się do udziału w formach wsparcia wynikających z Indywidualnej Ścieżki Reintegracji. §3. Uczestnik zobowiązuje się do wypełniania ankiet monitoringowych i ewaluacyjnych (w tym pomiarów PRE/POST — bez odrębnych podpisów). §4. Wypłata świadczeń integracyjnych i premii następuje przelewem na rachunek wskazany w oświadczeniu poniżej.`,
        ),
        pole("Numer rachunku bankowego do wypłat (oświadczenie jednorazowe)", undefined),
        pole("Miejscowość i data", `Świebodzin, ${dzis()}`),
        ...podpisy("podpis uczestnika/uczestniczki", "podpis przedstawiciela realizatora"),
      ];
    case "b-02":
      return [
        ...base,
        tytul("ARKUSZ DIAGNOZY KOMPLEKSOWEJ"),
        ...daneSOWA(u, false),
        pole("Diagnoza sytuacji społecznej", undefined),
        pole("Diagnoza sytuacji zawodowej i kompetencji", undefined),
        pole("Predyspozycje i potencjał uczestnika", undefined),
        pole("Rekomendacje do IŚR", undefined),
        akapit("Podpis uczestnika stanowi dowód wykonania usługi diagnozy (poz. 1.1 budżetu).", true),
        ...podpisy("podpis uczestnika/uczestniczki", "podpis osoby prowadzącej diagnozę"),
      ];
    case "b-03":
    case "b-03-2":
    case "b-03-3":
    case "b-04": {
      const nazwa =
        d.id === "b-03"
          ? "INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS) — CZĘŚĆ I"
          : d.id === "b-03-2"
            ? "INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS) — CZĘŚĆ II"
            : d.id === "b-03-3"
              ? "INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS) — CZĘŚĆ III"
              : "INDYWIDUALNY PROGRAM ROZWOJU (IPR)";
      return [
        ...base,
        tytul(nazwa),
        ...daneSOWA(u, false),
        pole("Cele reintegracji społecznej", undefined),
        pole("Cele reintegracji zawodowej", undefined),
        pole("Zaplanowane formy wsparcia", undefined),
        pole("Terminy przeglądów programu", undefined),
        akapit(
          d.id.startsWith("b-03")
            ? "Dokument wymagany ustawą o zatrudnieniu socjalnym (art. 12). Zmiany programu wprowadzane są aneksem podpisywanym przez uczestnika; karta monitoringu IŚR (B-05) pozostaje dokumentem kadrowym."
            : "Zmiany programu wprowadzane są aneksem podpisywanym przez uczestnika; karta monitoringu IŚR (B-05) pozostaje dokumentem kadrowym.",
          true,
        ),
        ...podpisy("podpis uczestnika/uczestniczki", "podpis pracownika socjalnego / koordynatora IŚR"),
      ];
    }
    case "c-04":
      return [
        ...base,
        tytul("KARTA WSPARCIA INDYWIDUALNEGO (UNIWERSALNA)"),
        ...daneSOWA(u, false),
        pole("Rodzaj wsparcia", "psycholog / terapeuta uzależnień / doradca zawodowy / pracownik socjalny"),
        pole("Data i godziny spotkania", undefined),
        pole("Zakres / przebieg wsparcia", undefined),
        akapit(
          "Podpis uczestnika przy każdym spotkaniu jest dowodem udzielenia wsparcia indywidualnego — K6.",
          true,
        ),
        ...podpisy("podpis uczestnika/uczestniczki", "podpis osoby udzielającej wsparcia"),
      ];
    case "d-01":
      return [
        ...base,
        tytul("KARTA KURSU ZAWODOWEGO UCZESTNIKA"),
        ...daneSOWA(u, false),
        pole("Nazwa kursu zawodowego", undefined),
        pole("Organizator / wykonawca kursu", undefined),
        akapit("Sekcja 1. Skierowanie na kurs — podpis uczestnika (1 z 2)."),
        akapit("Sekcja 2. Potwierdzenie odbioru materiałów, odzieży roboczej i ŚOI — podpis uczestnika (2 z 2)."),
        akapit("Sekcja 3. Ocena kompetencji w 4 etapach (wypełnia wykładowca/egzaminator): etap I …… etap II …… etap III …… etap IV ……"),
        pole("Numer certyfikatu / zaświadczenia", undefined),
        akapit("Jeden dokument zastępuje skierowanie, kartę oceny i protokół przekazania (K7); wymóg wniosku s. 19: ocena w 4 etapach, certyfikat.", true),
        ...podpisy("podpisy uczestnika (sekcje 1 i 2)", "podpis przedstawiciela realizatora"),
      ];
    case "f-01a":
      return [
        ...base,
        tytul("ANKIETA KOMPETENCJI PRE (pomiar wejściowy)"),
        pole("Kod uczestnika (identyfikowalność pomiaru)", u.id.toUpperCase()),
        pole("Pomiar", "PRE (pomiar wejściowy przy diagnozie)"),
        pole("Data pomiaru PRE", undefined),
        akapit("Część pomiarowa: samoocena kompetencji społecznych i zawodowych (skala 1–5) — pozycje zgodnie z wzorem F-01a."),
        akapit(
          "Ankieta bez podpisu uczestnika (K10): nie jest źródłem wskaźnika; identyfikowalność zapewnia kod uczestnika, datę i podpis osoby prowadzącej pomiar. Fakt wypełnienia rejestrowany jest w module Obecności.",
          true,
        ),
        ...podpisy("(bez podpisu uczestnika)", "data i podpis osoby prowadzącej pomiar PRE"),
      ];
    case "f-01b":
      return [
        ...base,
        tytul("ANKIETA KOMPETENCJI POST (pomiar końcowy)"),
        pole("Kod uczestnika (identyfikowalność pomiaru)", u.id.toUpperCase()),
        pole("Pomiar", "POST (pomiar końcowy przy zakończeniu udziału)"),
        pole("Data pomiaru POST", undefined),
        akapit("Część pomiarowa: samoocena kompetencji społecznych i zawodowych (skala 1–5) — pozycje zgodnie z wzorem F-01b. Wynik POST porównywany z pomiarem PRE (wzrost = POST − PRE)."),
        akapit(
          "Ankieta bez podpisu uczestnika (K10): nie jest źródłem wskaźnika; identyfikowalność zapewnia kod uczestnika, datę i podpis osoby prowadzącej pomiar. Fakt wypełnienia rejestrowany jest w module Obecności.",
          true,
        ),
        ...podpisy("(bez podpisu uczestnika)", "data i podpis osoby prowadzącej pomiar POST"),
      ];
    case "f-02":
      return [
        ...base,
        tytul("ANKIETA KOŃCOWA Z OŚWIADCZENIEM O SYTUACJI"),
        ...daneSOWA(u, false),
        akapit("Część I. Ankieta ewaluacyjna — ocena udziału w projekcie (skala 1–5)."),
        akapit("Część II. Oświadczenie o sytuacji po zakończeniu udziału: podjęcie zatrudnienia / poszukiwanie pracy / dalsza reintegracja (źródło wskaźników EECR01/EECR04)."),
        pole("Data zakończenia udziału", undefined),
        akapit("Wypełniana do 4 tygodni od zakończenia udziału; jeden podpis (K9). Późniejszy monitoring 12 m-cy: wpisy kadry w skoroszycie F-03 na podstawie dokumentów.", true),
        ...podpisy("data i podpis uczestnika/uczestniczki", "podpis osoby przyjmującej"),
      ];
    case "c-02":
      return [
        ...base,
        tytul("MIESIĘCZNA INDYWIDUALNA KARTA OBECNOŚCI"),
        ...daneSOWA(u, false),
        pole("Miesiąc / rok", undefined),
        pole("Liczba dni obecności (wg ewidencji w module Obecności)", undefined),
        pole("Nieobecności usprawiedliwione / nieusprawiedliwione", undefined),
        pole("Wymiar świadczenia integracyjnego do wypłaty", undefined),
        akapit("Sporządza pracownik socjalny na podstawie danych z modułu Obecności; podpisuje kadra — uczestnik nie podpisuje drugi raz (K4). Podstawa wypłaty świadczenia (wniosek s. 29).", true),
        ...podpisy("sporządził/-a (kadra)", "zatwierdził/-a (koordynator)"),
      ];
    default:
      return [
        ...base,
        tytul(d.nazwa.toUpperCase()),
        akapit(`Symbol: ${d.symbol} · Sekcja: ${d.sekcja} · Rodzaj: ${d.rodzaj}`),
        ...(d.rodzaj === "uczestnik" ? daneSOWA(u, false) : []),
        akapit(d.opis),
        akapit(`Zasada podpisów: ${d.podpisUczestnika}.`, true),
        akapit("Szczegółowa treść formularza — wg wzoru PDF z katalogu Formularze_projektowe (etap E5: pełne odwzorowanie wzorów).", true),
        ...podpisy("data i podpis", "data i podpis"),
      ];
  }
}

// ---- Branding (logotypy w stopce) — stan modułu, ustawiany przed generowaniem.
//      Dzięki temu nie trzeba przepinać sygnatur wszystkich funkcji generatora.
export interface ObrazStopki {
  data: Uint8Array;
  szer: number; // px
  wys: number; // px
  typ: "png" | "jpg";
}

let brandingStopki: ObrazStopki[] = [];

/** Ustawia logotypy nadrukowywane w stopce generowanych dokumentów. */
export function ustawBrandingStopki(obrazy: ObrazStopki[]): void {
  brandingStopki = obrazy;
}

function stopkaBrandingu(): Footer | undefined {
  if (brandingStopki.length === 0) return undefined;
  const dzieci: (ImageRun | TextRun)[] = [];
  brandingStopki.forEach((o, i) => {
    if (i > 0) dzieci.push(new TextRun("    "));
    dzieci.push(
      new ImageRun({
        data: o.data,
        transformation: { width: o.szer, height: o.wys },
        type: o.typ,
      }),
    );
  });
  return new Footer({
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: dzieci })],
  });
}

function dokumentDocx(children: Blok[]): Document {
  const stopka = stopkaBrandingu();
  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: stopka ? { default: stopka } : undefined,
        children,
      },
    ],
  });
}

async function pobierz(doc: Document, nazwaPliku: string) {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Generuje i pobiera pojedynczy dokument dla uczestnika. */
export async function generujDokument(
  d: WymaganyDokument,
  u: Uczestnik,
  spec: SpecyfikacjaProjektu = specyfikacjaCIS,
) {
  const blob = await dokumentBlob(d, u, spec);
  pobierzBlob(blob, `${d.symbol}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`);
}

/**
 * Buduje pojedynczy dokument jako Blob — używany przez podgląd i pobieranie.
 * Kolejność źródeł treści:
 * 1) surowy szablon .docx (nadpisanie kadry lub wzór z public/wzory) —
 *    wypełniany polami uczestnika bez zmiany jego nagłówka, stopki, stylów
 *    ani układu. Szablon jest źródłem prawdy dla wyglądu dokumentu,
 * 2) treść realna przepisana w tresci-realne.ts,
 * 3) ogólna treść generowana (fallback).
 */
export async function dokumentBlob(
  d: WymaganyDokument,
  u: Uczestnik,
  spec: SpecyfikacjaProjektu = specyfikacjaCIS,
): Promise<Blob> {
  const wzor = await wzorDlaDokumentu(spec, d);
  if (wzor) {
    return wypelnijSzablon(wzor, polaUczestnika(u, spec));
  }
  return Packer.toBlob(dokumentDocx(trescDokumentu(d, u, spec)));
}

/**
 * Krótki dokument podglądowy — pokazuje, jak wygląda strona z aktualnym
 * brandingiem (logotypy w stopce). Używany w sekcji „Wizualizacja projektu".
 */
export async function dokumentPodgladowy(
  spec: SpecyfikacjaProjektu = specyfikacjaCIS,
): Promise<Blob> {
  const children: Blok[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: spec.nazwa, bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Nabór: ${spec.nabor}`, size: 20 })],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      children: [
        new TextRun(
          "To jest podgląd układu dokumentu. Logotypy projektu są nadrukowane " +
            "w stopce strony — tak samo trafią na wszystkie dokumenty generowane " +
            "z katalogu formularzy.",
        ),
      ],
    }),
  ];
  return Packer.toBlob(dokumentDocx(children));
}

function pobierzBlob(blob: Blob, nazwaPliku: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Uczestnik wzorcowy (puste dane → kropki do uzupełnienia) — podgląd wzoru
 * formularza z listy specyfikacji, zanim wybierzemy konkretnego uczestnika.
 */
export function uczestnikWzor(
  dotyczy: WymaganyDokument["dotyczy"],
): Uczestnik {
  const bezrobotny = dotyczy !== "bierny";
  return {
    id: "wzor",
    imie: "",
    nazwisko: "",
    kategoria: bezrobotny ? "bezrobotny" : "bierny",
    sciezka: bezrobotny ? "IPZS" : "IPR",
    cykl: 1,
    grupa: "—",
    status: "aktywny",
    dataPrzystapienia: "—",
    frekwencja: 0,
    posiadaneDokumenty: [],
    etapSciezki: 0,
    postepSciezki: 0,
  };
}

/**
 * Dodaje wypełnione dokumenty jednej osoby do ZIP — KAŻDY dokument jako osobny
 * plik .docx zbudowany przez `dokumentBlob` (czyli z wzoru .docx z public/wzory,
 * z wypełnionymi polami {{...}}, a gdy wzoru brak — z treści generowanej z kodu).
 * Dzięki temu pakiety używają tych samych, aktualnych wzorów co pojedynczy dokument.
 */
async function dodajDokumentyOsobyDoZip(
  zip: JSZip,
  folder: string,
  dokumenty: WymaganyDokument[],
  u: Uczestnik,
  spec: SpecyfikacjaProjektu,
): Promise<number> {
  let n = 0;
  for (const d of dokumenty) {
    const blob = await dokumentBlob(d, u, spec);
    zip.file(
      `${folder}/${d.symbol}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`,
      blob,
    );
    n += 1;
  }
  return n;
}

export interface PakietWsadowy {
  uczestnik: Uczestnik;
  dokumenty: WymaganyDokument[];
}

/**
 * Generowanie wsadowe: pakiety dla wielu uczestników w jednym pliku ZIP.
 * Każdy uczestnik = osobny folder w ZIP, w nim po jednym pliku .docx na dokument
 * (z aktualnego wzoru, z wypełnionymi danymi uczestnika).
 */
export async function generujPakietyZbiorczo(
  pakiety: PakietWsadowy[],
  spec: SpecyfikacjaProjektu,
  nazwaZip = "Pakiety_dokumentow",
): Promise<number> {
  const zip = new JSZip();
  let wygenerowano = 0;
  for (const p of pakiety) {
    if (p.dokumenty.length === 0) continue;
    const folder = `${slug(p.uczestnik.nazwisko)}_${slug(p.uczestnik.imie)}`;
    await dodajDokumentyOsobyDoZip(zip, folder, p.dokumenty, p.uczestnik, spec);
    wygenerowano += 1;
  }
  if (wygenerowano === 0) return 0;
  const wynik = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(wynik);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(nazwaZip)}_${slug(spec.id)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return wygenerowano;
}

/**
 * Generuje pakiet jednej osoby jako ZIP — po jednym pliku .docx na dokument,
 * z aktualnego wzoru z wypełnionymi danymi (jak pojedynczy dokument).
 */
export async function generujPakiet(
  dokumenty: WymaganyDokument[],
  u: Uczestnik,
  spec: SpecyfikacjaProjektu = specyfikacjaCIS,
) {
  const zip = new JSZip();
  const folder = `${slug(u.nazwisko)}_${slug(u.imie)}`;
  await dodajDokumentyOsobyDoZip(zip, folder, dokumenty, u, spec);
  const wynik = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(wynik);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pakiet_dokumentow_${slug(u.nazwisko)}_${slug(u.imie)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DzienListy {
  iso: string;
  etykieta: string; // np. "1", "2" (numer dnia)
}

/**
 * Druk „Lista obecności" (sekcja C) — tabela uczestnicy × dni, z wpisanymi
 * znakami O/NN/L4≤21/L4>21/DW z rejestracji obecności. Orientacja pozioma, ze stopką
 * logotypów. Gotowy do druku i podpisu prowadzącego.
 */
export async function generujListeObecnosci(
  spec: SpecyfikacjaProjektu,
  uczestnicy: Uczestnik[],
  dni: DzienListy[],
  znakDla: (
    uczestnikId: string,
    iso: string,
  ) => KodObecnosci,
  opcje: { tytul: string; podtytul?: string },
) {
  const kraw = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
  const obramowanie = {
    top: kraw,
    bottom: kraw,
    left: kraw,
    right: kraw,
    insideHorizontal: kraw,
    insideVertical: kraw,
  };

  const komNagl = (tekst: string, szer?: number) =>
    new TableCell({
      width: szer ? { size: szer, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: "EFEFEF" },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: tekst, bold: true, size: 15 })],
        }),
      ],
    });

  const kom = (tekst: string, center = false) =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: tekst, size: 16 })],
        }),
      ],
    });

  const wierszNagl = new TableRow({
    tableHeader: true,
    children: [
      komNagl("Lp.", 360),
      komNagl("Imię i nazwisko", 2800),
      ...dni.map((d) => komNagl(d.etykieta)),
    ],
  });

  const wiersze = uczestnicy.map(
    (u, i) =>
      new TableRow({
        children: [
          kom(String(i + 1), true),
          kom(`${u.nazwisko} ${u.imie}`),
          ...dni.map((d) => kom(znakDla(u.id, d.iso), true)),
        ],
      }),
  );

  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: obramowanie,
    rows: [wierszNagl, ...wiersze],
  });

  const dzieci: Blok[] = [
    ...naglowekProjektu(spec),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: opcje.tytul, bold: true, size: 26 })],
    }),
    ...(opcje.podtytul
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: opcje.podtytul, size: 18 })],
          }),
        ]
      : []),
    tabela,
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun({
          text: "Legenda: O — obecny · NN — nieobecność nieusprawiedliwiona · L4≤21 — zwolnienie lekarskie do 21 dni · L4>21 — zwolnienie lekarskie powyżej 21 dni · DW — dzień wolny. L4 bez zakresu oznacza wpis historyczny.",
          size: 15,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: `Sporządzono: ${dzis()}.   Data i podpis prowadzącego/koordynatora: ………………………………………………`,
          size: 18,
        }),
      ],
    }),
  ];

  const stopka = stopkaBrandingu();
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            },
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        footers: stopka ? { default: stopka } : undefined,
        children: dzieci,
      },
    ],
  });
  await pobierz(doc, `Lista_obecnosci_${slug(opcje.tytul)}.docx`);
}

/**
 * Druk dziennej listy obecności (sekcja C, np. „ze świadczeniami") — jeden
 * dzień, wszyscy uczestnicy, kolumny: Obecność + opcjonalne (Wyżywienie,
 * Transport…) + podpis. Pionowa A4, ze stopką logotypów (przez dokumentDocx).
 */
export async function generujListeDzienna(
  spec: SpecyfikacjaProjektu,
  uczestnicy: Uczestnik[],
  opcje: {
    tytul: string;
    podtytul?: string;
    dataLabel: string;
    kolumny: string[];
    znakDla: (uczestnikId: string) => KodObecnosci;
  },
) {
  const kraw = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
  const obram = {
    top: kraw,
    bottom: kraw,
    left: kraw,
    right: kraw,
    insideHorizontal: kraw,
    insideVertical: kraw,
  };
  const tcN = (t: string, w?: number) =>
    new TableCell({
      width: w ? { size: w, type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: "EFEFEF" },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: t, bold: true, size: 18 })],
        }),
      ],
    });
  const tc = (t: string, center = false) =>
    new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: t, size: 19 })],
        }),
      ],
    });

  const naglowek = new TableRow({
    tableHeader: true,
    children: [
      tcN("Lp.", 500),
      tcN("Imię i nazwisko", 4200),
      tcN("Obecność", 1200),
      ...opcje.kolumny.map((k) => tcN(k)),
      tcN("Podpis uczestnika", 2600),
    ],
  });
  const wiersze = uczestnicy.map(
    (u, i) =>
      new TableRow({
        children: [
          tc(String(i + 1), true),
          tc(`${u.nazwisko} ${u.imie}`),
          tc(opcje.znakDla(u.id), true),
          ...opcje.kolumny.map(() => tc("")),
          tc(""),
        ],
      }),
  );
  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: obram,
    rows: [naglowek, ...wiersze],
  });

  const children: Blok[] = [
    ...naglowekProjektu(spec),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 20 },
      children: [new TextRun({ text: opcje.tytul, bold: true, size: 26 })],
    }),
    ...(opcje.podtytul
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: opcje.podtytul, size: 18 })],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: `Data: ${opcje.dataLabel}`, bold: true, size: 20 }),
      ],
    }),
    tabela,
    new Paragraph({
      spacing: { before: 160 },
      children: [
        new TextRun({
          text: "Legenda: O — obecny · NN — nieobecność nieusprawiedliwiona · L4≤21 — zwolnienie lekarskie do 21 dni · L4>21 — zwolnienie lekarskie powyżej 21 dni · DW — dzień wolny.",
          size: 15,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 280 },
      children: [
        new TextRun({
          text: "Data i podpis prowadzącego/koordynatora: ………………………………………………",
          size: 18,
        }),
      ],
    }),
  ];
  await pobierz(
    dokumentDocx(children),
    `Lista_obecnosci_dzienna_${slug(opcje.dataLabel)}.docx`,
  );
}
