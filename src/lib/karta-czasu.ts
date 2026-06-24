// Generator miesięcznej karty czasu pracy (etap E9) — układ wzoru CIS/G-02
// „Ewidencja czasu pracy". Wypełniany automatycznie danymi z grafiku kadry.
// Działa w przeglądarce (jak generator.ts).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { SpecyfikacjaProjektu } from "./projekt-spec";
import type { OsobaKadry } from "./db-kadra";
import {
  liczbaGodzin,
  formatGodziny,
  type WpisGrafiku,
} from "./db-grafik-kadry";

const MIESIACE_M = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const kraw = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const obramowanie = {
  top: kraw,
  bottom: kraw,
  left: kraw,
  right: kraw,
  insideHorizontal: kraw,
  insideVertical: kraw,
};

function komNagl(tekst: string, szer?: number): TableCell {
  return new TableCell({
    width: szer ? { size: szer, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: "EFEFEF" },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: tekst, bold: true, size: 16 })],
      }),
    ],
  });
}

function kom(tekst: string, center = false): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: tekst, size: 18 })],
      }),
    ],
  });
}

function poleNaglowka(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 19 }),
      new TextRun({ text: value || "…………………………", size: 19 }),
    ],
  });
}

function fmtData(iso: string): string {
  const [r, m, d] = iso.split("-");
  return `${d}.${m}.${r}`;
}

/**
 * Buduje dokument karty czasu pracy jednej osoby za wskazany miesiąc.
 * Wiersze tabeli = wpisy grafiku z danego miesiąca (posortowane po dacie/godz.).
 */
export function dokumentKarty(
  spec: SpecyfikacjaProjektu,
  osoba: OsobaKadry,
  wpisyMiesiaca: WpisGrafiku[],
  rok: number,
  miesiac: number, // 0–11
): Document {
  const wpisy = [...wpisyMiesiaca].sort((a, b) =>
    a.data === b.data
      ? a.godzinaOd.localeCompare(b.godzinaOd)
      : a.data.localeCompare(b.data),
  );

  const sumaGodzin = wpisy.reduce(
    (s, w) => s + liczbaGodzin(w.godzinaOd, w.godzinaDo),
    0,
  );

  const wierszNagl = new TableRow({
    tableHeader: true,
    children: [
      komNagl("Lp.", 500),
      komNagl("Data", 1400),
      komNagl("Od godz.", 1200),
      komNagl("Do godz.", 1200),
      komNagl("Liczba godzin", 1400),
      komNagl("Realizowane zadanie / forma wsparcia"),
    ],
  });

  const typLabel = (t: WpisGrafiku["typ"]): string =>
    t === "indywidualne" ? "indyw." : "grup.";
  const typOpis = (t: WpisGrafiku["typ"]): string =>
    t === "indywidualne" ? "indywidualne" : "grupowe";

  const wiersze = wpisy.map((w, i) => {
    const zadanie = w.zadanie
      ? `${w.zadanie} (${typLabel(w.typ)})`
      : `Zajęcia ${typOpis(w.typ)}`;
    return new TableRow({
      children: [
        kom(String(i + 1), true),
        kom(fmtData(w.data), true),
        kom(w.godzinaOd, true),
        kom(w.godzinaDo, true),
        kom(formatGodziny(liczbaGodzin(w.godzinaOd, w.godzinaDo)), true),
        kom(zadanie),
      ],
    });
  });

  // co najmniej kilka pustych wierszy, gdy mało wpisów (do ręcznego dopisania)
  const minWierszy = 8;
  const puste = Math.max(0, minWierszy - wiersze.length);
  for (let i = 0; i < puste; i++) {
    wiersze.push(
      new TableRow({
        children: [
          kom(String(wpisy.length + i + 1), true),
          kom(""),
          kom(""),
          kom(""),
          kom(""),
          kom(""),
        ],
      }),
    );
  }

  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: obramowanie,
    rows: [wierszNagl, ...wiersze],
  });

  const children = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: spec.wnioskodawca, bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: `Projekt: ${spec.nazwa}`, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Nabór: ${spec.nabor} · Okres realizacji: ${spec.okres}`,
          size: 16,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: "EWIDENCJA CZASU PRACY W PROJEKCIE",
          bold: true,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: "Formularz CIS/G-02", size: 16, color: "555555" }),
      ],
    }),
    poleNaglowka("Imię i nazwisko", `${osoba.imie} ${osoba.nazwisko}`.trim()),
    poleNaglowka("Stanowisko (pozycja budżetu)", osoba.stanowisko),
    poleNaglowka("Miesiąc / rok", `${MIESIACE_M[miesiac]} ${rok}`),
    poleNaglowka("Wymiar etatu / limit godzin", osoba.wymiar),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }),
    tabela,
    new Paragraph({
      spacing: { before: 200, after: 320 },
      children: [
        new TextRun({
          text: `Łączna liczba godzin w miesiącu: ${formatGodziny(sumaGodzin)}`,
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "………………………………………        ………………………………………",
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "data i podpis pracownika              zatwierdził: koordynator / kierownik CIS",
          size: 15,
          color: "555555",
        }),
      ],
    }),
  ];

  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
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

/** Generuje i pobiera kartę czasu pracy osoby za dany miesiąc. */
export async function generujKarteCzasu(
  spec: SpecyfikacjaProjektu,
  osoba: OsobaKadry,
  wpisyMiesiaca: WpisGrafiku[],
  rok: number,
  miesiac: number,
): Promise<void> {
  const doc = dokumentKarty(spec, osoba, wpisyMiesiaca, rok, miesiac);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Karta_czasu_pracy_${slug(osoba.nazwisko)}_${slug(osoba.imie)}_${MIESIACE_M[miesiac]}_${rok}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
