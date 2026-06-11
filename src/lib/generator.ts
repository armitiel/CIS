// Generator dokumentów .docx — działa w przeglądarce (etap E5).
// Dane zawsze z kartoteki uczestnika (struktura SOWA) — jedno źródło prawdy.
// Treści formularzy odzwierciedlają katalog A–H i zasady z Analizy optymalizacji v3.

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import type { Uczestnik } from "./types";
import {
  specyfikacjaCIS,
  type SpecyfikacjaProjektu,
  type WymaganyDokument,
} from "./projekt-spec";

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
      new TextRun({ text: value !== undefined && value !== "" ? String(value) : linia }),
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
): Paragraph[] {
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
    case "b-04": {
      const nazwa =
        d.id === "b-03"
          ? "INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS)"
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
          d.id === "b-03"
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
        pole("Rodzaj wsparcia", "psycholog / terapeuta / doradca zawodowy (IPD) / pośrednik pracy *"),
        pole("Data i godziny spotkania", undefined),
        pole("Zakres / przebieg wsparcia", undefined),
        akapit(
          "Podpis uczestnika przy każdym spotkaniu jest dowodem wykonania usługi rozliczanej godzinowo (poz. 1.1, 2.2, 2.3) — K6. (* niepotrzebne skreślić)",
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
    case "f-01":
      return [
        ...base,
        tytul("ANKIETA KOMPETENCJI PRE/POST"),
        pole("Kod uczestnika (identyfikowalność pomiaru)", u.id.toUpperCase()),
        pole("Pomiar", "PRE / POST (właściwe zakreślić)"),
        pole("Data pomiaru", undefined),
        akapit("Część pomiarowa: samoocena kompetencji społecznych i zawodowych (skala 1–5) — pozycje zgodnie z wzorem F-01."),
        akapit(
          "Ankieta bez podpisu uczestnika (K10): nie jest źródłem wskaźnika; identyfikowalność zapewnia kod uczestnika, datę i podpis osoby prowadzącej pomiar. Fakt wypełnienia potwierdza dzienna lista obecności C-01.",
          true,
        ),
        ...podpisy("(bez podpisu uczestnika)", "data i podpis osoby prowadzącej pomiar"),
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
        pole("Liczba dni obecności (wg list dziennych C-01)", undefined),
        pole("Nieobecności usprawiedliwione / nieusprawiedliwione", undefined),
        pole("Wymiar świadczenia integracyjnego do wypłaty", undefined),
        akapit("Sporządza pracownik socjalny na podstawie list dziennych; podpisuje kadra — uczestnik nie podpisuje drugi raz (K4). Podstawa wypłaty świadczenia (wniosek s. 29).", true),
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

function dokumentDocx(children: Paragraph[]): Document {
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
  const doc = dokumentDocx(trescDokumentu(d, u, spec));
  await pobierz(doc, `${d.symbol}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`);
}

/** Generuje pakiet (jeden plik .docx, dokumenty rozdzielone nową stroną). */
export async function generujPakiet(
  dokumenty: WymaganyDokument[],
  u: Uczestnik,
  spec: SpecyfikacjaProjektu = specyfikacjaCIS,
) {
  const children: Paragraph[] = [];
  dokumenty.forEach((d, i) => {
    const tresc = trescDokumentu(d, u, spec);
    if (i > 0) children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    children.push(...tresc);
  });
  await pobierz(
    dokumentDocx(children),
    `Pakiet_dokumentow_${slug(u.nazwisko)}_${slug(u.imie)}.docx`,
  );
}
