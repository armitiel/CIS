// Logotypy projektu w Supabase Storage — „baza logo w tle" per projekt.
// Pliki trzymane w podfolderze __logo wewnątrz folderu projektu
//   {user_id}/{projekt_id}/__logo/{rola}__{nazwa}
// dzięki czemu NIE mieszają się ze współdzielonymi dokumentami (te same
// polityki RLS co dla dokumentów). Jeden plik na slot/rolę (upload nadpisuje).

import { createClient } from "@/utils/supabase/client";
import { BUCKET_DOKUMENTY, bezpiecznaNazwa } from "./db-dokumenty-projektu";
import type { RolaLogo } from "./logotypy";
import type { ObrazStopki } from "./generator";

/** Docelowa wysokość logo w stopce (px) — wszystkie znaki w równej linii. */
const WYS_LOGO_STOPKA = 46;

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

/** Naturalne wymiary obrazu z URL (do zachowania proporcji w stopce). */
function wymiaryObrazu(url: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res({ w: 0, h: 0 });
    img.src = url;
  });
}

/**
 * Pobiera logotypy projektu jako obrazy gotowe do nadruku w stopce (.docx):
 * kolejność FE → barwy RP → UE → logo dodatkowe (partner), równa wysokość.
 * Obsługiwane PNG/JPG (SVG pomijane — wymaga rastrowego fallbacku w .docx).
 */
export async function pobierzBrandingStopki(
  projektId: string,
): Promise<ObrazStopki[]> {
  const lista = await listaLogo(projektId);
  const kolejnosc: RolaLogo[] = ["fe", "rp", "ue", "dodatkowe"];
  const posortowane = [...lista].sort(
    (a, b) => kolejnosc.indexOf(a.rola) - kolejnosc.indexOf(b.rola),
  );
  const wynik: ObrazStopki[] = [];
  for (const l of posortowane) {
    const n = l.nazwa.toLowerCase();
    const typ: "png" | "jpg" | null = n.endsWith(".png")
      ? "png"
      : n.endsWith(".jpg") || n.endsWith(".jpeg")
        ? "jpg"
        : null;
    if (!typ || !l.url) continue; // pomijamy SVG / nieobsługiwane
    try {
      const resp = await fetch(l.url);
      const data = new Uint8Array(await resp.arrayBuffer());
      const { w, h } = await wymiaryObrazu(l.url);
      if (!w || !h) continue;
      const szer = Math.max(1, Math.round((WYS_LOGO_STOPKA * w) / h));
      wynik.push({ data, szer, wys: WYS_LOGO_STOPKA, typ });
    } catch {
      // pomiń pojedynczy plik, którego nie udało się pobrać
    }
  }
  return wynik;
}

/**
 * Domyślny (wbudowany) branding z plików w public/ — używany, gdy projekt
 * nie ma własnych logotypów. Działa bez logowania (pliki serwowane publicznie).
 * Pliki nieobecne (404) są pomijane, więc brak pliku = brak nadruku.
 */
export async function pobierzBrandingDomyslny(
  sciezki: string[],
): Promise<ObrazStopki[]> {
  const wynik: ObrazStopki[] = [];
  for (const src of sciezki) {
    const n = src.toLowerCase();
    const typ: "png" | "jpg" | null = n.endsWith(".png")
      ? "png"
      : n.endsWith(".jpg") || n.endsWith(".jpeg")
        ? "jpg"
        : null;
    if (!typ) continue;
    try {
      const resp = await fetch(src);
      if (!resp.ok) continue;
      const data = new Uint8Array(await resp.arrayBuffer());
      const { w, h } = await wymiaryObrazu(src);
      if (!w || !h) continue;
      const szer = Math.max(1, Math.round((WYS_LOGO_STOPKA * w) / h));
      wynik.push({ data, szer, wys: WYS_LOGO_STOPKA, typ });
    } catch {
      // pomiń niedostępny plik
    }
  }
  return wynik;
}
