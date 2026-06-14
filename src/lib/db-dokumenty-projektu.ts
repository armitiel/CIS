// Współdzielone dokumenty projektu w Supabase Storage (bucket prywatny).
// Pliki referencyjne projektu (regulaminy, wzory umów, decyzje, skany) —
// BEZ danych osobowych w nazwie. Ścieżka: {user_id}/{projektId}/{plik},
// dzięki czemu polityki RLS ograniczają dostęp do własnych plików.
// Gdy Supabase/sesja niedostępne, wołający (strona Dokumenty) pokazuje
// informację zamiast się wywalać.

import { createClient } from "@/utils/supabase/client";

export const BUCKET_DOKUMENTY = "dokumenty-projektu";

export interface DokumentProjektu {
  nazwa: string; // nazwa pliku (klucz w buckecie)
  sciezka: string; // pełna ścieżka w buckecie
  rozmiar: number; // bajty
  dodano: string; // ISO
}

/** Czy storage jest dostępny (skonfigurowany Supabase + aktywna sesja). */
export async function storageDostepny(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

/** Klient + zalogowany użytkownik albo błąd. */
async function ctx() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Wymagane zalogowanie.");
  return { supabase, user };
}

const folder = (userId: string, projektId: string) => `${userId}/${projektId}`;

/** Bezpieczna nazwa pliku jako klucz storage: bez polskich znaków i spacji. */
export function bezpiecznaNazwa(nazwa: string): string {
  const kropka = nazwa.lastIndexOf(".");
  const baza = kropka > 0 ? nazwa.slice(0, kropka) : nazwa;
  const ext = kropka > 0 ? nazwa.slice(kropka).toLowerCase() : "";
  const czysta = baza
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${czysta || "plik"}${ext}`;
}

/** Lista dokumentów projektu zalogowanego użytkownika. */
export async function listaDokumentow(
  projektId: string,
): Promise<DokumentProjektu[]> {
  const { supabase, user } = await ctx();
  const prefix = folder(user.id, projektId);
  const { data, error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .list(prefix, { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((o) => o.id) // pomiń ewentualne podfoldery (bez id)
    .map((o) => ({
      nazwa: o.name,
      sciezka: `${prefix}/${o.name}`,
      rozmiar:
        typeof o.metadata?.size === "number" ? (o.metadata.size as number) : 0,
      dodano: o.created_at ?? "",
    }));
}

/** Wgrywa plik do bucketa (nadpisuje przy tej samej nazwie). */
export async function wgrajDokument(
  projektId: string,
  file: File,
): Promise<void> {
  const { supabase, user } = await ctx();
  const sciezka = `${folder(user.id, projektId)}/${bezpiecznaNazwa(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .upload(sciezka, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) throw error;
}

/** Pobiera zawartość pliku jako Blob. */
export async function pobierzDokument(sciezka: string): Promise<Blob> {
  const { supabase } = await ctx();
  const { data, error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .download(sciezka);
  if (error) throw error;
  return data;
}

/** Usuwa plik z bucketa. */
export async function usunDokument(sciezka: string): Promise<void> {
  const { supabase } = await ctx();
  const { error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .remove([sciezka]);
  if (error) throw error;
}
