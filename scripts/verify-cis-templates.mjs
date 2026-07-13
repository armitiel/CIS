import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/lib/wzory.ts"), "utf8");
const entries = [...source.matchAll(/"cis-2026:([^"]+)":\s*"([^"]+)"/g)].map(
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Zweryfikowano ${entries.length} wzorów CIS (DOCX/XLSX).`);
