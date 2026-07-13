// Prawdziwe wzory dokumentów (public/wzory/*.docx) z polami {{pole}}.
// Generator używa pliku wzoru zamiast treści generowanej z kodu wszędzie tam,
// gdzie wzór istnieje. Źródło: Formularze_projektowe / Szablony_dynamiczne.
//
// Pierwszeństwo źródeł surowego szablonu (ze znacznikami {{pole}}):
//   1) nadpisanie wgrane przez kadrę (szablony-dokumentow, per projekt+dokument),
//   2) wzór wbudowany z public/wzory (mapa WZORY poniżej).
// Dalej (już poza tym plikiem) kaskada schodzi do treści z kodu.

import type { SpecyfikacjaProjektu, WymaganyDokument } from "./projekt-spec";
import { maNadpisanie, surowyZNadpisania } from "./szablony-dokumentow";

/** klucz: `${spec.id}:${dokument.id}` -> plik w public/wzory/ */
const WZORY: Record<string, string> = {
  // === Projekt „Smartfon w Akcji" (6.8) — 12 obowiązujących wzorów (z folderu Wzory) ===
  "swa-6.8:swa-a-01": "SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx",
  "swa-6.8:swa-a-02": "SWA_A-02_Regulamin_rekrutacji_i_uczestnictwa_szablon.docx",
  "swa-6.8:swa-b-01": "SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx",
  "swa-6.8:swa-b-02": "SWA_B-02_Arkusz_Diagnozy_Kompleksowej_szablon.docx",
  "swa-6.8:swa-b-03": "SWA_B-03_Wniosek_o_dostosowania_dla_ON_szablon.docx",
  "swa-6.8:swa-c-01": "SWA_C-01_Lista_Obecnosci_szablon.docx",
  "swa-6.8:swa-c-05": "SWA_C-05_Protokol_przekazania_smartfona_szablon.docx",
  "swa-6.8:swa-d-01": "SWA_D-01_Arkusz_Walidacji_Ankieta_POST_szablon.docx",
  "swa-6.8:swa-d-02": "SWA_D-02_Certyfikat_szablon.docx",
  "swa-6.8:swa-d-03": "SWA_D-03_Ankieta_ewaluacyjna_trwalosc_szablon.docx",
  "swa-6.8:swa-f-01": "SWA_F-01_Ankieta_kompetencji_PRE_szablon.docx",
  "swa-6.8:swa-g-04": "SWA_G-04_Rozliczenie_kosztow_dojazdu_szablon.docx",

  // === Projekt PSF „Moja ścieżka rozwoju" (6.8 / 0014/25) — 8 formularzy uczestnika ===
  "psf-sciezka:psf-pak1": "PSF_PAK1_Zgloszenie_potrzeb_szablon.docx",
  "psf-sciezka:psf-e1": "PSF_E1_Klauzula_RODO_szablon.docx",
  "psf-sciezka:psf-a3": "PSF_A3_Umowa_wsparcia_szablon.docx",
  "psf-sciezka:psf-pak2": "PSF_PAK2_Karta_doradztwa_bilans_szablon.docx",
  "psf-sciezka:psf-b": "PSF_B_Indywidualny_Plan_Rozwoju_szablon.docx",
  "psf-sciezka:psf-c1": "PSF_C1_Formularz_zapotrzebowania_szablon.docx",
  "psf-sciezka:psf-pak3": "PSF_PAK3_Formularz_rozliczenia_szablon.docx",
  "psf-sciezka:psf-f1": "PSF_F1_Ankieta_ewaluacyjna_szablon.docx",

  // === CIS Świebodzin (6.11) — pełny katalog formularzy A–H (10.06.2026) ===
  // Formularze uczestnika z polami {{}} są wypełniane danymi automatycznie;
  // pozostałe są serwowane jako aktualne wzory 1:1.
  "cis-2026:a-01": "CIS_A-01_Pakiet_zgloszeniowy_uczestnika.docx",
  "cis-2026:a-02": "CIS_A-02_Regulamin_rekrutacji_i_uczestnictwa.docx",
  "cis-2026:a-03": "CIS_A-03_Karta_oceny_kandydata.docx",
  "cis-2026:a-04": "CIS_A-04_Protokol_posiedzenia_komisji_lista_rankingowa.docx",
  "cis-2026:b-01": "CIS_B-01_Umowa_uczestnictwa_w_projekcie.docx",
  "cis-2026:b-02": "CIS_B-02_Arkusz_diagnozy_kompleksowej.docx",
  "cis-2026:b-03": "CIS_B-03-1_Indywidualny_Program_Zatrudnienia_Socjalnego_cz_I.docx",
  "cis-2026:b-04": "CIS_B-04_Indywidualny_Program_Rozwoju.docx",
  "cis-2026:b-05": "CIS_B-05_Karta_monitoringu_ISR_z_opinia_koncowa.docx",
  "cis-2026:c-02": "CIS_C-02_Miesieczna_indywidualna_karta_obecnosci.docx",
  "cis-2026:c-03": "CIS_C-03_Dziennik_zajec_z_programem.docx",
  "cis-2026:c-03-1": "CIS_C-03-1_Dziennik_zajec_Wsparcie_psychologa.docx",
  "cis-2026:c-03-2": "CIS_C-03-2_Dziennik_zajec_Terapia_uzaleznien.docx",
  "cis-2026:c-03-3": "CIS_C-03-3_Dziennik_zajec_Doradztwo_zawodowe.docx",
  "cis-2026:c-04": "CIS_C-04_Karta_wsparcia_indywidualnego.docx",
  "cis-2026:c-05": "CIS_C-05_Harmonogram_realizacji_wsparcia.docx",
  "cis-2026:c-06": "CIS_C-06_Broszura_informacyjna_dla_uczestnikow.docx",
  "cis-2026:c-07": "CIS_C-07_Dziennik_praktyk_pomoc_opiekuna_dziennego.docx",
  "cis-2026:c-08": "CIS_C-08_Dziennik_praktyk_utrzymanie_zieleni_i_drog.docx",
  "cis-2026:c-09": "CIS_C-09_Dziennik_praktyk_sanitarno_porzadkowa.docx",
  "cis-2026:d-01": "CIS_D-01_Karta_kursu_zawodowego_uczestnika.docx",
  "cis-2026:e-01": "CIS_E-01_Regulamin_swiadczen_i_premii_z_lista_wyplat.docx",
  "cis-2026:e-02": "CIS_E-02_Zbiorcza_lista_wydan_rzeczowych.docx",
  "cis-2026:e-03": "CIS_E-03_Wniosek_o_opieke_nad_osoba_zalezna.docx",
  "cis-2026:e-04": "CIS_E-04_Zgloszenie_zbiorcze_na_wyjazd_integracyjny.docx",
  "cis-2026:e-05": "CIS_E-05_Protokol_przekazania_OT_samochodu.docx",
  "cis-2026:f-01a": "CIS_F-01a_Ankieta_kompetencji_PRE.docx",
  "cis-2026:f-01b": "CIS_F-01b_Ankieta_kompetencji_POST.docx",
  "cis-2026:f-02": "CIS_F-02_Ankieta_koncowa_z_oswiadczeniem.docx",
  "cis-2026:g-01": "CIS_G-01_Zakres_obowiazkow_kadry_merytorycznej.docx",
  "cis-2026:g-02": "CIS_G-02_Ewidencja_czasu_pracy.docx",
  "cis-2026:g-03": "CIS_G-03_Protokol_odbioru_uslug_zewnetrznych.docx",
  "cis-2026:h-01": "CIS_H-01_Regulamin_zarzadzania_projektem.docx",
  "cis-2026:h-07": "CIS_H-07_Porozumienie_JST_swiadczenia_integracyjne.docx",
};

const cache = new Map<string, ArrayBuffer>();

/** Nazwa pliku wbudowanego wzoru dla dokumentu (albo undefined). */
export function plikWbudowanegoWzoru(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): string | undefined {
  return WZORY[`${spec.id}:${d.id}`];
}

/** Czy dokument ma wbudowany wzór .docx (mapa WZORY) — bez nadpisań. */
export function maWzor(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): boolean {
  return Boolean(plikWbudowanegoWzoru(spec, d));
}

/** Czy dokument ma edytowalny szablon .docx: wbudowany wzór LUB nadpisanie kadry. */
export function maWzorEdytowalny(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): boolean {
  return maWzor(spec, d) || maNadpisanie(spec.id, d.id);
}

/** Pobiera wbudowany wzór z public/wzory (z cache) albo null. */
async function wzorWbudowany(plik: string): Promise<ArrayBuffer | null> {
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

/**
 * Surowy szablon dokumentu (ArrayBuffer, ze znacznikami {{pole}}):
 *   nadpisanie kadry -> wzór wbudowany -> null.
 */
export async function surowySzablonDokumentu(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): Promise<ArrayBuffer | null> {
  const nadpisany = surowyZNadpisania(spec.id, d.id);
  if (nadpisany) return nadpisany;
  const plik = plikWbudowanegoWzoru(spec, d);
  if (!plik) return null;
  return wzorWbudowany(plik);
}

/** Zgodność wsteczna: zwraca surowy szablon dokumentu. */
export async function wzorDlaDokumentu(
  spec: SpecyfikacjaProjektu,
  d: WymaganyDokument,
): Promise<ArrayBuffer | null> {
  return surowySzablonDokumentu(spec, d);
}
