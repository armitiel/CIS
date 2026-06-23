// Nadpisania szablonów per dokument — edytowalny wzór konkretnego formularza.
// Kadra pobiera surowy szablon (z {{polami}}), zmienia treść w Wordzie i wgrywa
// z powrotem. Wgrany plik jest zapisywany pod kluczem {projekt}:{dokument}
// i ma pierwszeństwo przed wzorem wbudowanym (public/wzory) oraz treścią z kodu.
//
// Magazyn: localStorage (base64). Docelowo (E1) do przeniesienia na Supabase
// Storage — analogicznie do db-dokumenty-projektu / db-logo-projektu.

import { arrayBufferZBase64, base64ZArrayBuffer } from "./szablony";

export interface SzablonDokumentu {
  nazwaPliku: string; // oryginalna nazwa wgranego pliku
  base64: string;
  dodano: string; // ISO data
}

const klucz = (projektId: string, dokId: string) =>
  `cis-app:szablon-dok:${projektId}:${dokId}`;

/** Czy dokument ma wgrany własny (nadpisany) szablon. */
export function maNadpisanie(projektId: string, dokId: string): boolean {
  try {
    return localStorage.getItem(klucz(projektId, dokId)) !== null;
  } catch {
    return false;
  }
}

/** Wczytuje nadpisany szablon dokumentu (metadane + base64) albo null. */
export function wczytajNadpisanie(
  projektId: string,
  dokId: string,
): SzablonDokumentu | null {
  try {
    const raw = localStorage.getItem(klucz(projektId, dokId));
    return raw ? (JSON.parse(raw) as SzablonDokumentu) : null;
  } catch {
    return null;
  }
}

/** Surowy szablon (ArrayBuffer, ze znacznikami {{pole}}) z nadpisania albo null. */
export function surowyZNadpisania(
  projektId: string,
  dokId: string,
): ArrayBuffer | null {
  const s = wczytajNadpisanie(projektId, dokId);
  return s ? arrayBufferZBase64(s.base64) : null;
}

/** Zapisuje wgrany przez kadrę szablon dokumentu. */
export function zapiszNadpisanie(
  projektId: string,
  dokId: string,
  nazwaPliku: string,
  plik: ArrayBuffer,
): void {
  const wpis: SzablonDokumentu = {
    nazwaPliku,
    base64: base64ZArrayBuffer(plik),
    dodano: new Date().toISOString(),
  };
  try {
    localStorage.setItem(klucz(projektId, dokId), JSON.stringify(wpis));
  } catch {
    /* przekroczony limit localStorage — zmiana pozostanie tylko w pamięci sesji */
  }
}

/** Usuwa nadpisanie — dokument wraca do wzoru wbudowanego / treści z kodu. */
export function usunNadpisanie(projektId: string, dokId: string): void {
  try {
    localStorage.removeItem(klucz(projektId, dokId));
  } catch {
    /* brak dostępu do localStorage — pomijamy */
  }
}
