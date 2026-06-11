// Interaktywny PDF (AcroForm) — wypełnialny formularz zgłoszeniowy:
// pola tekstowe, listy rozwijane ze słowników SOWA, pola wyboru.
// Działa w przeglądarce (pdf-lib); polskie znaki przez wbudowaną czcionkę DejaVu.

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  SLOWNIK_DEGURBA,
  SLOWNIK_PLEC,
  SLOWNIK_STATUS_RYNKU_PRACY,
  SLOWNIK_TAK_NIE,
  SLOWNIK_WYKSZTALCENIE,
} from "./slowniki";
import type { SpecyfikacjaProjektu } from "./projekt-spec";
import type { Uczestnik } from "./types";

const A4: [number, number] = [595.28, 841.89];
const MARGINES = 50;
const SZER = A4[0] - 2 * MARGINES;

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
}

function nowaStrona(ctx: Ctx) {
  ctx.page = ctx.doc.addPage(A4);
  ctx.y = A4[1] - MARGINES;
}

function miejsce(ctx: Ctx, potrzebne: number) {
  if (ctx.y - potrzebne < MARGINES) nowaStrona(ctx);
}

function etykieta(ctx: Ctx, tekst: string) {
  miejsce(ctx, 30);
  ctx.page.drawText(tekst, {
    x: MARGINES,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: rgb(0.25, 0.3, 0.27),
  });
  ctx.y -= 13;
}

function poleTekstowe(
  ctx: Ctx,
  nazwa: string,
  label: string,
  opts: { szer?: number; wartosc?: string; hint?: string } = {},
) {
  etykieta(ctx, label + (opts.hint ? `   (${opts.hint})` : ""));
  const h = 18;
  miejsce(ctx, h + 10);
  const field = ctx.doc.getForm().createTextField(nazwa);
  if (opts.wartosc) field.setText(opts.wartosc);
  field.addToPage(ctx.page, {
    x: MARGINES,
    y: ctx.y - h,
    width: opts.szer ?? SZER,
    height: h,
    borderColor: rgb(0.7, 0.75, 0.72),
    backgroundColor: rgb(0.98, 0.99, 0.98),
  });
  field.updateAppearances(ctx.font);
  ctx.y -= h + 14;
}

function listaRozwijana(
  ctx: Ctx,
  nazwa: string,
  label: string,
  opcje: readonly string[],
  wartosc?: string,
) {
  etykieta(ctx, label);
  const h = 18;
  miejsce(ctx, h + 10);
  const field = ctx.doc.getForm().createDropdown(nazwa);
  field.addOptions(opcje.filter((o) => o !== ""));
  if (wartosc && opcje.includes(wartosc)) field.select(wartosc);
  field.addToPage(ctx.page, {
    x: MARGINES,
    y: ctx.y - h,
    width: SZER,
    height: h,
    borderColor: rgb(0.7, 0.75, 0.72),
    backgroundColor: rgb(0.98, 0.99, 0.98),
  });
  field.updateAppearances(ctx.font);
  ctx.y -= h + 14;
}

function checkbox(ctx: Ctx, nazwa: string, tekst: string) {
  miejsce(ctx, 26);
  const field = ctx.doc.getForm().createCheckBox(nazwa);
  field.addToPage(ctx.page, {
    x: MARGINES,
    y: ctx.y - 12,
    width: 12,
    height: 12,
    borderColor: rgb(0.5, 0.55, 0.52),
  });
  // tekst oświadczenia (łamanie wierszy)
  const slowa = tekst.split(" ");
  let linia = "";
  let yy = ctx.y - 10;
  const maxSzer = SZER - 22;
  for (const s of slowa) {
    const test = linia ? `${linia} ${s}` : s;
    if (ctx.font.widthOfTextAtSize(test, 8.5) > maxSzer) {
      ctx.page.drawText(linia, { x: MARGINES + 20, y: yy, size: 8.5, font: ctx.font });
      yy -= 11;
      linia = s;
    } else linia = test;
  }
  if (linia)
    ctx.page.drawText(linia, { x: MARGINES + 20, y: yy, size: 8.5, font: ctx.font });
  ctx.y = yy - 14;
}

function tekst(ctx: Ctx, t: string, size = 9, bold = false) {
  miejsce(ctx, size + 8);
  ctx.page.drawText(t, {
    x: MARGINES,
    y: ctx.y,
    size,
    font: bold ? ctx.fontBold : ctx.font,
  });
  ctx.y -= size + 7;
}

/** Generuje interaktywny PDF formularza zgłoszeniowego (pusty lub wstępnie wypełniony). */
export async function generujInteraktywnyFormularz(
  spec: SpecyfikacjaProjektu,
  u?: Uczestnik,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = await fetch("/fonts/DejaVuSans.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const font = await doc.embedFont(fontBytes, { subset: true });
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = { doc, page: doc.addPage(A4), font, fontBold, y: 0 };
  ctx.y = A4[1] - MARGINES;

  // nagłówek
  tekst(ctx, spec.wnioskodawca, 11, true);
  tekst(ctx, `Projekt: ${spec.nazwa}`, 9);
  tekst(ctx, `Nabór: ${spec.nabor} · Okres realizacji: ${spec.okres}`, 8);
  ctx.y -= 6;
  miejsce(ctx, 30);
  ctx.page.drawText("FORMULARZ ZGŁOSZENIOWY UCZESTNIKA (interaktywny)", {
    x: MARGINES,
    y: ctx.y,
    size: 14,
    font: ctx.fontBold,
  });
  ctx.y -= 26;
  tekst(
    ctx,
    "Pola tekstowe wypełnij z klawiatury; pola słownikowe wybierz z listy rozwijanej.",
    8,
  );
  ctx.y -= 8;

  const s = u?.sowa;
  // Część I — dane
  tekst(ctx, "Część I. Dane uczestnika (słowniki SOWA EFS)", 10.5, true);
  ctx.y -= 4;
  poleTekstowe(ctx, "imie", "Imię", { wartosc: u?.imie });
  poleTekstowe(ctx, "nazwisko", "Nazwisko", { wartosc: u?.nazwisko });
  poleTekstowe(ctx, "pesel", "PESEL", {
    wartosc: s?.pesel,
    hint: "11 cyfr",
  });
  listaRozwijana(ctx, "plec", "Płeć", SLOWNIK_PLEC, s?.plec === "kobieta" ? "Kobieta" : s?.plec === "mężczyzna" ? "Mężczyzna" : undefined);
  listaRozwijana(ctx, "wyksztalcenie", "Wykształcenie", SLOWNIK_WYKSZTALCENIE);
  poleTekstowe(ctx, "obywatelstwo", "Obywatelstwo", { wartosc: s?.obywatelstwo ?? "polskie" });
  poleTekstowe(ctx, "miejscowosc", "Miejscowość zamieszkania (wg TERYT)", { wartosc: s?.miejscowosc });
  poleTekstowe(ctx, "gmina", "Gmina (wg TERYT)", { wartosc: s?.gmina });
  poleTekstowe(ctx, "powiat", "Powiat (forma przymiotnikowa, małe litery)", { wartosc: s?.powiat });
  poleTekstowe(ctx, "wojewodztwo", "Województwo", { wartosc: s?.wojewodztwo });
  poleTekstowe(ctx, "kod_pocztowy", "Kod pocztowy", { wartosc: s?.kodPocztowy, hint: "format 00-000" });
  listaRozwijana(ctx, "degurba", "Obszar wg stopnia urbanizacji (DEGURBA)", SLOWNIK_DEGURBA);
  poleTekstowe(ctx, "telefon", "Telefon kontaktowy", { wartosc: s?.telefon });
  poleTekstowe(ctx, "email", "Adres e-mail (bez polskich znaków)", { wartosc: s?.email });
  listaRozwijana(ctx, "status_rynku_pracy", "Status osoby na rynku pracy", SLOWNIK_STATUS_RYNKU_PRACY);
  listaRozwijana(ctx, "osoba_obcego_pochodzenia", "Osoba obcego pochodzenia", SLOWNIK_TAK_NIE, "Nie");
  listaRozwijana(ctx, "obywatel_panstwa_trzeciego", "Obywatel państwa trzeciego", SLOWNIK_TAK_NIE, "Nie");
  poleTekstowe(ctx, "data_rozpoczecia", "Data rozpoczęcia udziału w projekcie", { hint: "RRRR-MM-DD" });

  // Część II — oświadczenia
  ctx.y -= 6;
  tekst(ctx, "Część II. Oświadczenia i zgody (jeden podpis na końcu)", 10.5, true);
  ctx.y -= 4;
  checkbox(ctx, "osw_kwalifikowalnosc", "Oświadczam, że spełniam kryteria kwalifikowalności do udziału w projekcie.");
  checkbox(ctx, "osw_deklaracja", "Deklaruję udział w projekcie i aktywne uczestnictwo w formach wsparcia wynikających z Indywidualnej Ścieżki Reintegracji.");
  checkbox(ctx, "osw_rodo", "Zapoznałem/-am się z klauzulą informacyjną RODO (FEWL 2021–2027) i przyjmuję ją do wiadomości.");
  checkbox(ctx, "osw_dane_szczegolne", "Wyrażam zgodę na przetwarzanie danych szczególnej kategorii w zakresie niezbędnym do realizacji projektu.");

  // podpisy
  ctx.y -= 14;
  miejsce(ctx, 60);
  poleTekstowe(ctx, "miejscowosc_data", "Miejscowość i data", { szer: 230 });
  tekst(ctx, "Podpis kandydata/kandydatki: ……………………………………………   Podpis osoby przyjmującej: ……………………………………………", 8.5);

  const bytes = await doc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = u
    ? `Formularz_interaktywny_${u.nazwisko}_${u.imie}.pdf`
    : `Formularz_interaktywny_${spec.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
