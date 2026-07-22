import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

const root = path.join(process.cwd(), "public", "wzory");
const replacements = new Map([
  ["PSF_PAK1_Zgloszenie_potrzeb_szablon.docx", "{{data_dokumentu}}"],
  ["PSF_PAK2_Karta_doradztwa_bilans_szablon.docx", "{{data_dokumentu}}"],
  ["PSF_B_Indywidualny_Plan_Rozwoju_szablon.docx", "{{data_dokumentu_kropki}}"],
  ["PSF_C1_Formularz_zapotrzebowania_szablon.docx", "{{data_dokumentu}}"],
]);

function wstawDoNastepnejKomorki(xml, label, placeholder) {
  if (xml.includes(placeholder)) return xml;
  const labelAt = xml.indexOf(label);
  if (labelAt < 0) throw new Error(`nie znaleziono etykiety: ${label}`);
  const labelCellEnd = xml.indexOf("</w:tc>", labelAt);
  const valueCellStart = xml.indexOf("<w:tc", labelCellEnd);
  const valueCellEnd = xml.indexOf("</w:tc>", valueCellStart);
  const paragraphEnd = xml.indexOf("</w:p>", valueCellStart);
  if (paragraphEnd < 0 || paragraphEnd > valueCellEnd)
    throw new Error(`nie znaleziono pustej komórki po: ${label}`);
  return (
    xml.slice(0, paragraphEnd) +
    `<w:r><w:t>${placeholder}</w:t></w:r>` +
    xml.slice(paragraphEnd)
  );
}

function poprawNaglowekUmowyA3(xml) {
  let wynik = xml;
  if (!wynik.includes("{{nr_umowy}} z dnia {{data_dokumentu}} r.")) {
    wynik = wynik.replace(
      "{{nr_umowy}}",
      "{{nr_umowy}} z dnia {{data_dokumentu}} r.",
    );
  }
  const marker = "Data: {{data_dokumentu}}";
  const markerAt = wynik.indexOf(marker);
  if (markerAt >= 0) {
    const paragraphStarts = [
      ...wynik.slice(0, markerAt).matchAll(/<w:p(?=[ >])/g),
    ];
    const paragraphStart = paragraphStarts.at(-1)?.index ?? -1;
    const paragraphEnd = wynik.indexOf("</w:p>", markerAt);
    if (paragraphStart < 0 || paragraphEnd < 0)
      throw new Error("A3: nie znaleziono akapitu z datą podpisu");
    wynik = wynik.slice(0, paragraphStart) + wynik.slice(paragraphEnd + 6);
  }
  return wynik;
}

for (const [name, replacement] of replacements) {
  const file = path.join(root, name);
  const zip = new PizZip(fs.readFileSync(file));
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error(`${name}: brak word/document.xml`);
  const xml = xmlFile.asText().replaceAll("{{data_dzis}}", replacement);
  zip.file("word/document.xml", xml);
  fs.writeFileSync(file, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
}

const dodatkowe = [
  ["PSF_A3_Umowa_wsparcia_szablon.docx", (xml) =>
    poprawNaglowekUmowyA3(
      xml
        .replace("_____/FELB.06.08/[rok]", "{{nr_umowy}}")
        .replace("Data: ___/___/______", "Data: {{data_dokumentu}}"),
    )],
  ["PSF_C1_Formularz_zapotrzebowania_szablon.docx", (xml) =>
    wstawDoNastepnejKomorki(xml, "Nr Umowy wsparcia", "{{nr_umowy}}")],
  ["PSF_PAK2_Karta_doradztwa_bilans_szablon.docx", (xml) =>
    xml.replace(
      "od __:__ do __:__",
      "od {{godzina_spotkania_od}} do {{godzina_spotkania_do}}",
    )],
  ["PSF_PAK3_Formularz_rozliczenia_szablon.docx", (xml) =>
    wstawDoNastepnejKomorki(xml, "Nr Umowy wsparcia", "{{nr_umowy}}")],
];

for (const [name, transform] of dodatkowe) {
  const file = path.join(root, name);
  const zip = new PizZip(fs.readFileSync(file));
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error(`${name}: brak word/document.xml`);
  zip.file("word/document.xml", transform(xmlFile.asText()));
  fs.writeFileSync(file, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
}
