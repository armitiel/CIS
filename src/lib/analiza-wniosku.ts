// Analiza dokumentu projektowego (wniosek o dofinansowanie itp.) pod kątem
// danych nowego projektu. Zasada: NIC nie zgadujemy — każde pole ma pokazane
// źródło (fragment tekstu), a dokument bez cech wniosku jest jasno oznaczany
// jako nierozpoznany. Obsługa: .docx i .txt w przeglądarce; PDF → wklej tekst.

import JSZip from "jszip";

export type Rozpoznanie = "wniosek" | "czesciowe" | "nierozpoznany";

export interface Trafienie {
  pole: string;
  wartosc: string;
  /** fragment dokumentu, z którego pochodzi wartość (do weryfikacji) */
  fragment: string;
}

export interface WynikAnalizy {
  rozpoznanie: Rozpoznanie;
  /** ile słów-kluczy wniosku znaleziono (0–10) */
  punkty: number;
  pola: {
    nazwa?: string;
    nabor?: string;
    wnioskodawca?: string;
    okres?: string;
  };
  trafienia: Trafienie[];
  uwagi: string[];
}

/** Tekst z pliku PDF — warstwa tekstowa przez pdfjs (lazy import). */
async function tekstZPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const czesci: string[] = [];
  for (let s = 1; s <= doc.numPages; s++) {
    const strona = await doc.getPage(s);
    const tresc = await strona.getTextContent();
    czesci.push(
      tresc.items
        .map((i) => ("str" in i ? i.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  const tekst = czesci.join("\n").trim();
  if (tekst.length < 50) {
    throw new Error(
      "Ten PDF wygląda na skan (brak warstwy tekstowej) — wklej tekst wniosku ręcznie albo użyj wersji .docx.",
    );
  }
  return tekst;
}

/** Tekst z pliku .pdf, .docx (word/document.xml) lub .txt. */
export async function wyciagnijTekstZPliku(file: File): Promise<string> {
  const nazwa = file.name.toLowerCase();
  if (nazwa.endsWith(".txt")) {
    return await file.text();
  }
  if (nazwa.endsWith(".docx")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("Plik .docx bez treści (brak word/document.xml).");
    return xml
      .replace(/<w:p[ >]/g, "\n<w:p ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, " ")
      .trim();
  }
  if (nazwa.endsWith(".pdf")) {
    return await tekstZPdf(file);
  }
  throw new Error(
    "Nieobsługiwany format — wczytaj .pdf, .docx lub .txt, albo wklej tekst dokumentu.",
  );
}

const fragmentWokol = (tekst: string, idx: number, dl: number): string => {
  const od = Math.max(0, idx - 30);
  const doIdx = Math.min(tekst.length, idx + dl + 50);
  return `…${tekst.slice(od, doIdx).replace(/\s+/g, " ").trim()}…`;
};

const czysc = (s: string): string =>
  s
    .replace(/\s+/g, " ")
    .replace(/^[\s:"„”\-–—]+|[\s:"„”\-–—]+$/g, "")
    .trim();

/** Słowa-klucze typowe dla wniosku o dofinansowanie (EFS+/SOWA). */
const SLOWA_KLUCZE = [
  /wniosek o dofinansowanie/i,
  /wnioskodawc/i,
  /grup[aęy] docelow/i,
  /okres realizacji/i,
  /bud[żz]et/i,
  /zadani[ae]/i,
  /wska[źz]nik/i,
  /dofinansowani/i,
  /harmonogram/i,
  /uczestnik/i,
];

export function analizujDokument(tekstWe: string): WynikAnalizy {
  const tekst = tekstWe.replace(/ /g, " ");
  const trafienia: Trafienie[] = [];
  const uwagi: string[] = [];
  const pola: WynikAnalizy["pola"] = {};

  // 1. Numer naboru, np. FELB.06.11-IZ.00-0001/26 (też FERS/FEDS itd.)
  const mNabor = tekst.match(
    /\b[A-Z]{4}\.\d{2}\.\d{2}(?:-[A-Z]{2,3}\.\d{2}-\d{3,4}\/\d{2})?\b/,
  );
  if (mNabor && mNabor.index !== undefined) {
    pola.nabor = mNabor[0];
    trafienia.push({
      pole: "Nabór",
      wartosc: mNabor[0],
      fragment: fragmentWokol(tekst, mNabor.index, mNabor[0].length),
    });
  }

  // 2. Tytuł projektu
  const mTytul =
    tekst.match(/tytu[łl] projektu\s*[:\-]?\s*[„"]?([^\n„"”]{5,180})/i) ??
    tekst.match(/projekt\s*[:]?\s*[„"]([^\n"”]{5,180})[”"]/i);
  if (mTytul && mTytul.index !== undefined) {
    pola.nazwa = czysc(mTytul[1]);
    trafienia.push({
      pole: "Tytuł projektu",
      wartosc: pola.nazwa,
      fragment: fragmentWokol(tekst, mTytul.index, mTytul[0].length),
    });
  }

  // 3. Wnioskodawca / beneficjent
  const mWnio = tekst.match(
    /(?:nazwa wnioskodawcy|wnioskodawca|beneficjent)\s*[:\-]?\s*[„"]?([^\n„"”]{3,140})/i,
  );
  if (mWnio && mWnio.index !== undefined) {
    pola.wnioskodawca = czysc(mWnio[1]);
    trafienia.push({
      pole: "Wnioskodawca",
      wartosc: pola.wnioskodawca,
      fragment: fragmentWokol(tekst, mWnio.index, mWnio[0].length),
    });
  }

  // 4. Okres realizacji (dd.mm.rrrr – dd.mm.rrrr albo rrrr-mm-dd)
  const data = "(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4}|\\d{4}-\\d{2}-\\d{2})";
  const mOkres = tekst.match(
    new RegExp(
      `okres realizacji[^\\n]{0,60}?${data}\\s*(?:–|—|-|do)\\s*${data}`,
      "i",
    ),
  );
  if (mOkres && mOkres.index !== undefined) {
    pola.okres = `${mOkres[1]} – ${mOkres[2]}`;
    trafienia.push({
      pole: "Okres realizacji",
      wartosc: pola.okres,
      fragment: fragmentWokol(tekst, mOkres.index, mOkres[0].length),
    });
  }

  // 5. Skoring słów-kluczy
  const punkty = SLOWA_KLUCZE.filter((re) => re.test(tekst)).length;
  const liczbaPol = Object.keys(pola).length;

  let rozpoznanie: Rozpoznanie;
  if (punkty >= 4 && liczbaPol >= 2) {
    rozpoznanie = "wniosek";
  } else if (liczbaPol >= 1 || punkty >= 3) {
    rozpoznanie = "czesciowe";
    uwagi.push(
      "Dokument tylko częściowo przypomina wniosek o dofinansowanie — zweryfikuj i uzupełnij pola ręcznie.",
    );
  } else {
    rozpoznanie = "nierozpoznany";
    uwagi.push(
      "To nie wygląda na wniosek o dofinansowanie (brak numeru naboru, tytułu projektu, wnioskodawcy ani typowych sekcji). Żadne pola nie zostały wypełnione automatycznie — wpisz dane ręcznie albo wczytaj inny dokument.",
    );
  }

  if (tekst.length < 300) {
    uwagi.push(
      "Dokument jest bardzo krótki — upewnij się, że wczytany plik zawiera pełną treść wniosku.",
    );
  }

  return { rozpoznanie, punkty, pola, trafienia, uwagi };
}
