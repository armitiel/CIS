// Generator dokumentów .docx — działa w przeglądarce (etap E5, wersja pierwsza).
// Dane zawsze z kartoteki uczestnika — jedno źródło prawdy.

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import type { Uczestnik } from "./types";
import { specyfikacjaCIS, type WymaganyDokument } from "./projekt-spec";

const dzis = () =>
  new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function naglowekProjektu(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: specyfikacjaCIS.wnioskodawca, bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `Projekt: ${specyfikacjaCIS.nazwa}`, size: 20 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Nabór: ${specyfikacjaCIS.nabor} · Okres realizacji: ${specyfikacjaCIS.okres}`,
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

function pole(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
  });
}

function podpisy(): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 600 }, children: [] }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      children: [
        new TextRun("………………………………………"),
        new TextRun("\t………………………………………"),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      children: [
        new TextRun({ text: "data i podpis uczestnika/uczestniczki", size: 18, color: "555555" }),
        new TextRun({ text: "\tpodpis osoby przyjmującej", size: 18, color: "555555" }),
      ],
    }),
  ];
}

function daneUczestnika(u: Uczestnik): Paragraph[] {
  return [
    pole("Imię i nazwisko", `${u.imie} ${u.nazwisko}`),
    pole(
      "Kategoria uczestnika",
      u.kategoria === "bezrobotny"
        ? "osoba bezrobotna (uczestnik CIS)"
        : "osoba bierna zawodowo",
    ),
    pole("Ścieżka reintegracji", `IŚR + ${u.sciezka}`),
    pole("Cykl rekrutacji", `${u.cykl}`),
    pole("Grupa", u.grupa),
    pole(
      "Data przystąpienia do projektu",
      u.dataPrzystapienia === "—" ? "(lista rezerwowa)" : u.dataPrzystapienia,
    ),
    pole("PESEL", "………………………………… (uzupełnić — etap E1: pole z walidacją)"),
    pole("Adres zamieszkania", "…………………………………………………………………"),
  ];
}

function trescDokumentu(d: WymaganyDokument, u: Uczestnik): Paragraph[] {
  switch (d.id) {
    case "formularz-zgloszeniowy":
      return [
        ...naglowekProjektu(),
        tytul("FORMULARZ ZGŁOSZENIOWY"),
        ...daneUczestnika(u),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun(
              "Oświadczam, że podane dane są zgodne z prawdą oraz że spełniam kryteria kwalifikowalności do udziału w projekcie.",
            ),
          ],
        }),
        ...podpisy(),
      ];
    case "deklaracja-uczestnictwa":
      return [
        ...naglowekProjektu(),
        tytul("DEKLARACJA UCZESTNICTWA W PROJEKCIE"),
        pole("Imię i nazwisko", `${u.imie} ${u.nazwisko}`),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun(
              `Deklaruję udział w projekcie „${specyfikacjaCIS.nazwa}” realizowanym przez ${specyfikacjaCIS.wnioskodawca} i zobowiązuję się do aktywnego uczestnictwa w zaplanowanych formach wsparcia, w tym w działaniach wynikających z Indywidualnej Ścieżki Reintegracji.`,
            ),
          ],
        }),
        pole("Miejscowość i data", `Świebodzin, ${dzis()}`),
        ...podpisy(),
      ];
    case "oswiadczenie-rodo":
      return [
        ...naglowekProjektu(),
        tytul("OŚWIADCZENIE UCZESTNIKA PROJEKTU (RODO)"),
        pole("Imię i nazwisko", `${u.imie} ${u.nazwisko}`),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun(
              "Oświadczam, że zapoznałem/zapoznałam się z klauzulą informacyjną dotyczącą przetwarzania moich danych osobowych w ramach programu Fundusze Europejskie dla Lubuskiego 2021–2027 i przyjmuję do wiadomości, że administratorem danych jest Zarząd Województwa Lubuskiego, a dane przetwarzane są w celu realizacji, monitoringu, ewaluacji i kontroli projektu.",
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "[Pełna treść klauzuli informacyjnej IZ FEWL — do wstawienia z dokumentacji naboru w etapie E5.]",
              italics: true,
              color: "777777",
            }),
          ],
        }),
        ...podpisy(),
      ];
    case "isr":
    case "ipzs":
    case "ipr": {
      const nazwy: Record<string, string> = {
        isr: "INDYWIDUALNA ŚCIEŻKA REINTEGRACJI (IŚR)",
        ipzs: "INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS)",
        ipr: "INDYWIDUALNY PLAN REINTEGRACJI (IPR)",
      };
      return [
        ...naglowekProjektu(),
        tytul(nazwy[d.id]),
        ...daneUczestnika(u),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun({ text: "Diagnoza sytuacji uczestnika: ", bold: true }),
            new TextRun("…………………………………………………………………………………"),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "Cele reintegracji społecznej: ", bold: true }),
            new TextRun("…………………………………………………………………………………"),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "Cele reintegracji zawodowej: ", bold: true }),
            new TextRun("…………………………………………………………………………………"),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "Zaplanowane formy wsparcia i terminy przeglądów: ", bold: true }),
            new TextRun("…………………………………………………………………………………"),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "[W etapie E3 sekcje wypełniane będą wpisami kadry merytorycznej z modułu Ścieżki.]",
              italics: true,
              color: "777777",
            }),
          ],
        }),
        ...podpisy(),
      ];
    }
    case "zaswiadczenie-uczestnictwa":
      return [
        ...naglowekProjektu(),
        tytul("ZAŚWIADCZENIE O UCZESTNICTWIE"),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun(
              `Zaświadcza się, że Pan/Pani ${u.imie} ${u.nazwisko} uczestniczył/a w projekcie „${specyfikacjaCIS.nazwa}” (${specyfikacjaCIS.nabor}) realizowanym przez ${specyfikacjaCIS.wnioskodawca}.`,
            ),
          ],
        }),
        pole("Okres udziału", `${u.dataPrzystapienia} – ………………`),
        pole("Miejscowość i data", `Świebodzin, ${dzis()}`),
        ...podpisy(),
      ];
    default:
      return [
        ...naglowekProjektu(),
        tytul(d.nazwa.toUpperCase()),
        ...daneUczestnika(u),
        ...podpisy(),
      ];
  }
}

function dokumentDocx(children: Paragraph[]): Document {
  return new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
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
    .replace(/[^a-zA-Z0-9]+/g, "_");

/** Generuje i pobiera pojedynczy dokument dla uczestnika. */
export async function generujDokument(d: WymaganyDokument, u: Uczestnik) {
  const doc = dokumentDocx(trescDokumentu(d, u));
  await pobierz(doc, `${slug(d.nazwa)}_${slug(u.nazwisko)}_${slug(u.imie)}.docx`);
}

/** Generuje pakiet (jeden plik .docx, dokumenty rozdzielone nową stroną). */
export async function generujPakiet(dokumenty: WymaganyDokument[], u: Uczestnik) {
  const children: Paragraph[] = [];
  dokumenty.forEach((d, i) => {
    const tresc = trescDokumentu(d, u);
    if (i > 0 && tresc.length > 0) {
      children.push(
        new Paragraph({ pageBreakBefore: true, children: [] }),
      );
    }
    children.push(...tresc);
  });
  const doc = dokumentDocx(children);
  await pobierz(doc, `Pakiet_dokumentow_${slug(u.nazwisko)}_${slug(u.imie)}.docx`);
}
