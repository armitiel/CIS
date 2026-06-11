// Podgląd dokumentów .docx w przeglądarce — bez dodatkowych zależności.
// Parsuje word/document.xml (JSZip + DOMParser) do prostych linii tekstu
// z minimalnym formatowaniem (pogrubienie, kursywa, wyśrodkowanie, tabulator
// lewa/prawa). Renderowanie: modal podglądu w module Dokumenty.
// Działa zarówno dla dokumentów generowanych (generator.ts), jak i szablonów
// własnych użytkownika ({{pola}} pozostają widoczne jako znaczniki).

import JSZip from "jszip";

export interface LiniaPodgladu {
  tekst: string;
  bold: boolean;
  italic: boolean;
  center: boolean;
  /** część tekstu po tabulatorze — wyrównana do prawej (nagłówki, podpisy) */
  prawa?: string;
}

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Czyta plik .docx (Blob lub ArrayBuffer) i zwraca linie do podglądu. */
export async function podgladDocx(
  zrodlo: Blob | ArrayBuffer,
): Promise<LiniaPodgladu[]> {
  const zip = await JSZip.loadAsync(zrodlo);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("nieprawidłowy plik .docx (brak document.xml)");
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const linie: LiniaPodgladu[] = [];
  const paragrafy = dom.getElementsByTagNameNS(W, "p");
  for (let i = 0; i < paragrafy.length; i++) {
    linie.push(liniaZParagrafu(paragrafy[i]));
  }
  // utnij puste linie z końca dokumentu
  while (linie.length > 0 && pusta(linie[linie.length - 1])) linie.pop();
  return linie;
}

const pusta = (l: LiniaPodgladu) => l.tekst === "" && !l.prawa;

function liniaZParagrafu(p: Element): LiniaPodgladu {
  let tekst = "";
  let bold = false;
  let italic = false;
  const runs = p.getElementsByTagNameNS(W, "r");
  for (let j = 0; j < runs.length; j++) {
    const r = runs[j];
    const dzieci = r.childNodes;
    for (let k = 0; k < dzieci.length; k++) {
      const n = dzieci[k] as Element;
      if (n.localName === "t") tekst += n.textContent ?? "";
      else if (n.localName === "tab") tekst += "\t";
      else if (n.localName === "br") tekst += "\n";
    }
    const rPr = r.getElementsByTagNameNS(W, "rPr")[0];
    if (rPr) {
      if (rPr.getElementsByTagNameNS(W, "b").length > 0) bold = true;
      if (rPr.getElementsByTagNameNS(W, "i").length > 0) italic = true;
    }
  }
  let center = false;
  const pPr = p.getElementsByTagNameNS(W, "pPr")[0];
  const jc = pPr?.getElementsByTagNameNS(W, "jc")[0];
  if (jc) {
    const val = jc.getAttributeNS(W, "val") ?? jc.getAttribute("w:val");
    center = val === "center";
  }
  const [lewa, prawa] = tekst.split("\t");
  return { tekst: lewa ?? "", prawa: prawa || undefined, bold, italic, center };
}
