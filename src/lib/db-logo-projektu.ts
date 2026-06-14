// Logotypy projektu w Supabase Storage — „baza logo w tle" per projekt.
// Pliki trzymane w podfolderze __logo wewnątrz folderu projektu
//   {user_id}/{projekt_id}/__logo/{rola}__{nazwa}
// dzięki czemu NIE mieszają się ze współdzielonymi dokumentami (te same
// polityki RLS co dla dokumentów). Jeden plik na slot/rolę (upload nadpisuje).

import { createClient } from "@/utils/supabase/client";
import { BUCKET_DOKUMENTY, bezpiecznaNazwa } from "./db-dokumenty-projektu";
import type { RolaLogo } from "./logotypy";

export interface LogoProjektu {
  rola: RolaLogo;
  nazwa: string; // oryginalna (bezpieczna) nazwa pliku
  sciezka: string; // pełna ścieżka w buckecie
  url: string; // podpisany URL do podglądu (bucket prywatny)
}

async function ctx() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Wymagane zalogowanie.");
  return { supabase, user };
}

const folderLogo = (userId: string, projektId: string) =>
  `${userId}/${projektId}/__logo`;

/** Lista logotypów projektu (z podpisanymi URL-ami do podglądu). */
export async function listaLogo(projektId: string): Promise<LogoProjektu[]> {
  const { supabase, user } = await ctx();
  const prefix = folderLogo(user.id, projektId);
  const { data, error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .list(prefix);
  if (error) throw error;
  const pliki = (data ?? []).filter((o) => o.id);
  const wynik: LogoProjektu[] = [];
  for (const o of pliki) {
    const sciezka = `${prefix}/${o.name}`;
    const rola = (o.name.split("__")[0] as RolaLogo) ?? "dodatkowe";
    const nazwa = o.name.split("__").slice(1).join("__") || o.name;
    const { data: signed } = await supabase.storage
      .from(BUCKET_DOKUMENTY)
      .createSignedUrl(sciezka, 3600);
    wynik.push({ rola, nazwa, sciezka, url: signed?.signedUrl ?? "" });
  }
  return wynik;
}

/** Wgrywa logo do slotu danej roli (usuwa wcześniejsze tej roli). */
export async function wgrajLogo(
  projektId: string,
  rola: RolaLogo,
  file: File,
): Promise<void> {
  const { supabase, user } = await ctx();
  const prefix = folderLogo(user.id, projektId);
  // usuń istniejące pliki tej samej roli (jeden slot = jeden plik)
  const { data: istniejace } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .list(prefix);
  const doUsuniecia = (istniejace ?? [])
    .filter((o) => o.id && o.name.startsWith(`${rola}__`))
    .map((o) => `${prefix}/${o.name}`);
  if (doUsuniecia.length > 0) {
    await supabase.storage.from(BUCKET_DOKUMENTY).remove(doUsuniecia);
  }
  const sciezka = `${prefix}/${rola}__${bezpiecznaNazwa(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .upload(sciezka, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) throw error;
}

/** Usuwa wskazany plik logo. */
export async function usunLogo(sciezka: string): Promise<void> {
  const { supabase } = await ctx();
  const { error } = await supabase.storage
    .from(BUCKET_DOKUMENTY)
    .remove([sciezka]);
  if (error) throw error;
}
