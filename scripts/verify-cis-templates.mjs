import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import PizZip from "pizzip";

const source = readFileSync(join(process.cwd(), "src/lib/wzory.ts"), "utf8");
const entries = [...source.matchAll(/"cis-2026:([^"]+)":\s*"([^"]+)"/g)].map(
  ([, id, filename]) => ({ id, filename }),
);
const swaEntries = [...source.matchAll(/"swa-6\.8:([^"]+)":\s*"([^"]+)"/g)].map(
  ([, id, filename]) => ({ id, filename }),
);
const psfEntries = [...source.matchAll(/"psf-sciezka:([^"]+)":\s*"([^"]+)"/g)].map(
  ([, id, filename]) => ({ id, filename }),
);

const errors = [];
if (entries.length !== 37) {
  errors.push(`Oczekiwano 37 wzorów CIS, znaleziono ${entries.length}.`);
}
if (entries.some(({ id }) => id === "c-01")) {
  errors.push("C-01 nie może wrócić do katalogu aplikacji.");
}
if (!entries.some(({ id, filename }) => id === "f-03" && filename.endsWith(".xlsx"))) {
  errors.push("Brakuje skoroszytu F-03 w mapie wzorów.");
}

for (const { id, filename } of entries) {
  const path = join(process.cwd(), "public/wzory", filename);
  if (!existsSync(path)) {
    errors.push(`${id}: brak pliku ${filename}.`);
    continue;
  }
  const signature = readFileSync(path).subarray(0, 4).toString("hex");
  if (signature !== "504b0304") {
    errors.push(`${id}: ${filename} nie jest poprawnym plikiem Office Open XML.`);
  }
}

if (swaEntries.length !== 12) {
  errors.push(`Oczekiwano 12 wzorów SWA, znaleziono ${swaEntries.length}.`);
}
for (const { id, filename } of swaEntries) {
  const path = join(process.cwd(), "public/wzory", filename);
  if (!existsSync(path)) {
    errors.push(`${id}: brak pliku ${filename}.`);
    continue;
  }
  const signature = readFileSync(path).subarray(0, 4).toString("hex");
  if (signature !== "504b0304") {
    errors.push(`${id}: ${filename} nie jest poprawnym plikiem Office Open XML.`);
  }
}

if (psfEntries.length !== 8) {
  errors.push(`Oczekiwano 8 wzorów PSF, znaleziono ${psfEntries.length}.`);
}
for (const { id, filename } of psfEntries) {
  const path = join(process.cwd(), "public/wzory", filename);
  if (!existsSync(path)) {
    errors.push(`${id}: brak pliku ${filename}.`);
    continue;
  }
  const signature = readFileSync(path).subarray(0, 4).toString("hex");
  if (signature !== "504b0304") {
    errors.push(`${id}: ${filename} nie jest poprawnym plikiem Office Open XML.`);
  }
}

function documentXml(filename) {
  const zip = new PizZip(readFileSync(join(process.cwd(), "public/wzory", filename)));
  return zip.file("word/document.xml")?.asText() ?? "";
}

const a01 = documentXml("SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx");
for (const pole of [
  "cb_kobieta", "cb_mezczyzna", "cb_miasto", "cb_wies",
  "cb_swa_pracujaca", "cb_swa_bezrob_zarej", "cb_swa_bezrob_niezarej",
  "cb_swa_bierna", "cb_swa_emeryt_rencista", "cb_swa_wyk_podstawowe",
  "cb_swa_wyk_gimnazjalne", "cb_swa_wyk_srednie", "cb_swa_wyk_policealne",
  "cb_swa_wyk_wyzsze", "cb_swa_niepelnosprawnosc_nie",
  "cb_swa_niepelnosprawnosc_tak", "cb_swa_cykl1", "cb_swa_cykl2",
]) {
  if (!a01.includes(`{{${pole}}}`)) errors.push(`SWA A-01: brak pola {{${pole}}}.`);
}

const b01 = documentXml("SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx");
for (const pole of [
  "data_dokumentu_kropki", "miejsce_umowy", "forma_umowy",
  "zamieszkaly_umowa", "zwany_umowa",
]) {
  if (!b01.includes(`{{${pole}}}`)) errors.push(`SWA B-01: brak pola {{${pole}}}.`);
}
if (b01.includes("SWA/G-01")) errors.push("SWA B-01 nadal odwołuje się do błędnego formularza SWA/G-01.");
if (!b01.includes("SWA/C-05")) errors.push("SWA B-01 nie odwołuje się do właściwego formularza SWA/C-05.");

const pak1 = documentXml("PSF_PAK1_Zgloszenie_potrzeb_szablon.docx");
for (const pole of [
  "cb_isced0", "cb_isced1", "cb_isced2", "cb_isced3", "cb_isced4", "cb_isced58",
  "cb_psf_niepelnosprawnosc", "pkt_psf_premiujace", "pkt_psf_ogolem",
]) {
  if (!pak1.includes(`{{${pole}}}`)) errors.push(`PSF PAK1: brak pola {{${pole}}}.`);
}
if (pak1.includes("SUMA PUNKTÓW PREMIUJĄCYCH: 50")) {
  errors.push("PSF PAK1 nadal zawiera punktację 50 wpisaną na stałe.");
}

const pak2 = documentXml("PSF_PAK2_Karta_doradztwa_bilans_szablon.docx");
const ipr = documentXml("PSF_B_Indywidualny_Plan_Rozwoju_szablon.docx");
for (const nazwa of ["cyfrowe", "jezykowe", "spoleczne", "zawodowe", "zielone"]) {
  for (let poziom = 1; poziom <= 5; poziom++) {
    const pole = `cb_psf_${nazwa}_${poziom}`;
    if (!pak2.includes(`{{${pole}}}`)) errors.push(`PSF PAK2: brak pola {{${pole}}}.`);
  }
  const pole = `psf_poziom_${nazwa}`;
  if (!ipr.includes(`{{${pole}}}`)) errors.push(`PSF IPR: brak pola {{${pole}}}.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Zweryfikowano ${entries.length} wzorów CIS, ${swaEntries.length} wzorów SWA i ${psfEntries.length} wzorów PSF (DOCX/XLSX).`);
