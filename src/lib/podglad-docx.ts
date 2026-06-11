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
