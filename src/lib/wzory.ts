// Prawdziwe wzory dokumentów (public/wzory/*.docx) z polami {{pole}}.
// Generator używa pliku wzoru zamiast treści generowanej z kodu wszędzie tam,
// gdzie wzór istnieje. Źródło: Formularze_projektowe / Szablony_dynamiczne.
//
// UWAGA: wzory SWA_* są dokumentami projektu 6.8 "Smartfon w Akcji" — mają
// w treści nazwę projektu i klauzulę RODO 6.8, dlatego podpinamy je TYLKO
// pod specyfikację swa-6.8. Dokumenty CIS mają własne realne treści
// zaadaptowane w tresci-realne.ts (inny projekt = inne klauzule).

import type { SpecyfikacjaProjektu, WymaganyDokument } from "./projekt-spec";

/** klucz: `${spec.id}:${dokument.id}` -> plik w public/wzory/ */
const WZORY: Record<string, string> = {
  "swa-6.8:swa-a-01": "SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx",
  "swa-6.8:swa-b-01": "SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx",
  "swa-6.8:swa-f-01": "SWA_D-02_Certyfikat_szablon.docx",
};

const cache = new Map<string, ArrayBuffer>();

/** Czy dokument ma prawdziwy wzór (synchronicznie — do oznaczeń w UI). */
export function maWzor(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): boolean {
  return Boolean(WZORY[`${spec.id}:${d.id}`]);
}

/** Pobiera wzór dokumentu (z cache po pierwszym pobraniu) albo null. */
export async function wzorDlaDokumentu(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): Promise<ArrayBuffer | null> {
  const plik = WZORY[`${spec.id}:${d.id}`];
  if (!plik) return null;
  const wCache = cache.get(plik);
  if (wCache) return wCache;
  try {
    const res = await fetch(`/wzory/${plik}`);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    cache.set(plik, ab);
    return ab;
  } catch {
    return null;
  }
}
