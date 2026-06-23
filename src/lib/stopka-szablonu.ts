// Nadruk stopki z logotypami projektu na gotowy plik .docx (np. wypełniony
// szablon). Reużywa tego samego źródła brandingu co ścieżka „z kodu"
// (ObrazStopki z pobierzBrandingFinalny) — dzięki temu dokumenty z szablonów
// dostają identyczne logo jak dokumenty generowane z kodu.
//
// Działa w przeglądarce: czysta manipulacja XML w paczce .docx (pizzip).

import PizZip from "pizzip";
import type { ObrazStopki } from "./generator";

const NS = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
};
const EMU = 9525; // 1 px @96dpi

function rysunek(rId: string, n: number, szer: number, wys: number): string {
  const cx = Math.round(szer * EMU);
  const cy = Math.round(wys * EMU);
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${n}" name="logo${n}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS.a}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="${NS.a}"><a:graphicData uri="${NS.pic}">` +
    `<pic:pic xmlns:pic="${NS.pic}"><pic:nvPicPr><pic:cNvPr id="${n}" name="logo${n}.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

/**
 * Nadrukowuje stopkę z logotypami na plik .docx i zwraca nowy Blob.
 * Gdy brak logotypów — zwraca plik bez zmian.
 */
export function nadrukujStopke(
  plik: ArrayBuffer,
  obrazy: ObrazStopki[],
): Blob {
  const zip = new PizZip(plik);
  const mime =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!obrazy || obrazy.length === 0) {
    return zip.generate({ type: "blob", mimeType: mime }) as Blob;
  }

  // 1) media + relacje footera + runy z rysunkami
  const rels: string[] = [];
  const runy: string[] = [];
  obrazy.forEach((o, i) => {
    const n = i + 1;
    const ext = o.typ === "jpg" ? "jpeg" : "png";
    const nazwaMedia = `logo_stopka_${n}.${ext}`;
    zip.file(`word/media/${nazwaMedia}`, o.data, { binary: true });
    const rId = `rIdLogo${n}`;
    rels.push(
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nazwaMedia}"/>`,
    );
    if (i > 0) runy.push(`<w:r><w:t xml:space="preserve">    </w:t></w:r>`);
    runy.push(rysunek(rId, n, o.szer, o.wys));
  });

  // 2) footer1.xml
  const footerXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:ftr xmlns:w="${NS.w}" xmlns:r="${NS.r}" xmlns:wp="${NS.wp}" xmlns:a="${NS.a}" xmlns:pic="${NS.pic}">` +
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${runy.join("")}</w:p></w:ftr>`;
  zip.file("word/footer1.xml", footerXml);

  // 3) relacje footera → obrazy
  zip.file(
    "word/_rels/footer1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`,
  );

  // 4) [Content_Types].xml — domyślne typy obrazów + override footera
  let ct = zip.file("[Content_Types].xml")!.asText();
  if (!/Extension="png"/.test(ct))
    ct = ct.replace(
      "</Types>",
      `<Default Extension="png" ContentType="image/png"/></Types>`,
    );
  if (obrazy.some((o) => o.typ === "jpg") && !/Extension="jpeg"/.test(ct))
    ct = ct.replace(
      "</Types>",
      `<Default Extension="jpeg" ContentType="image/jpeg"/></Types>`,
    );
  if (!/footer1\.xml/.test(ct))
    ct = ct.replace(
      "</Types>",
      `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`,
    );
  zip.file("[Content_Types].xml", ct);

  // 5) relacja dokument → footer
  const footerRelId = "rIdStopkaLogo";
  const relsDoc = zip.file("word/_rels/document.xml.rels")!.asText();
  zip.file(
    "word/_rels/document.xml.rels",
    relsDoc.replace(
      "</Relationships>",
      `<Relationship Id="${footerRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
    ),
  );

  // 6) document.xml — footerReference jako pierwsze dziecko sectPr (body-level
  //    sectPr to ostatni w dokumencie). Usuwamy ewentualne istniejące
  //    footerReference typu default, by uniknąć duplikatu.
  let doc = zip.file("word/document.xml")!.asText();
  doc = doc.replace(
    /<w:footerReference[^>]*w:type="default"[^>]*\/>/g,
    "",
  );
  const ref = `<w:footerReference w:type="default" r:id="${footerRelId}"/>`;
  const idx = doc.lastIndexOf("<w:sectPr");
  if (idx !== -1) {
    const koniecOtwarcia = doc.indexOf(">", idx) + 1;
    doc = doc.slice(0, koniecOtwarcia) + ref + doc.slice(koniecOtwarcia);
    zip.file("word/document.xml", doc);
  }

  return zip.generate({ type: "blob", mimeType: mime }) as Blob;
}
