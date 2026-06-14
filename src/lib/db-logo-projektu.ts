// Logotypy projektu w Supabase Storage — „baza logo w tle" per projekt.
// Pliki trzymane w podfolderze __logo wewnątrz folderu projektu
//   {user_id}/{projekt_id}/__logo/{rola}__{nazwa}
// dzięki czemu NIE mieszają się ze współdzielonymi dokumentami (te same
// polityki RLS co dla dokumentów). Jeden plik na slot/rolę (upload nadpisuje).

import { createClient } from "@/utils/supabase/client";
import { BUCKET_DOKUMENTY, bezpiecznaNazwa } from "./db-dokumenty-projektu";
import type { RolaLogo, ZestawLogotypow } from "./logotypy";
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

/** Maks. szerokość pojedynczego obrazu w stopce (px) — by pasek mieścił się
 *  w obszarze strony A4 (margines 2,54 cm). */
const MAX_SZER_STOPKA = 600;

function typObrazu(nazwa: string): "png" | "jpg" | null {
  const n = nazwa.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  return null;
}

/** Pobiera obraz z URL i skaluje do stopki (równa wysokość, limit szerokości). */
async function obrazZUrl(
  url: string,
  nazwaDoTypu: string,
): Promise<ObrazStopki | null> {
  const typ = typObrazu(nazwaDoTypu);
  if (!typ || !url) return null; // SVG/nieobsługiwane pomijamy
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = new Uint8Array(await resp.arrayBuffer());
    const { w, h } = await wymiaryObrazu(url);
    if (!w || !h) return null;
    let wys = WYS_LOGO_STOPKA;
    let szer = Math.max(1, Math.round((WYS_LOGO_STOPKA * w) / h));
    if (szer > MAX_SZER_STOPKA) {
      szer = MAX_SZER_STOPKA;
      wys = Math.max(1, Math.round((MAX_SZER_STOPKA * h) / w));
    }
    return { data, szer, wys, typ };
  } catch {
    return null;
  }
}

const KOLEJNOSC_ROL: RolaLogo[] = ["fe", "rp", "ue", "dodatkowe"];

/**
 * Finalny branding stopki dla projektu:
 *  • jeśli projekt ma JAKIEKOLWIEK własne logo — składa per slot: własny znak
 *    tam gdzie wgrany, w pozostałych slotach znak domyślny programu;
 *  • w przeciwnym razie — używa oficjalnego, złożonego paska (domyslnePliki).
 * Działa też bez logowania (wtedy zawsze pasek/znaki domyślne z public/).
 */
export async function pobierzBrandingFinalny(
  projektId: string,
  zestaw: ZestawLogotypow,
): Promise<ObrazStopki[]> {
  let custom: Partial<Record<RolaLogo, LogoProjektu>> = {};
  try {
    for (const l of await listaLogo(projektId)) custom[l.rola] = l;
  } catch {
    custom = {};
  }

  const wynik: ObrazStopki[] = [];

  if (Object.keys(custom).length > 0) {
    for (const rola of KOLEJNOSC_ROL) {
      const wlasny = custom[rola];
      const url = wlasny?.url ?? zestaw.domyslneZnaki?.[rola] ?? "";
      const nazwa = wlasny?.nazwa ?? zestaw.domyslneZnaki?.[rola] ?? "";
      if (!url) continue;
      const o = await obrazZUrl(url, nazwa);
      if (o) wynik.push(o);
    }
    if (wynik.length > 0) return wynik;
  }

  // brak własnych logo → oficjalny złożony pasek programu
  for (const src of zestaw.domyslnePliki) {
    const o = await obrazZUrl(src, src);
    if (o) wynik.push(o);
  }
  return wynik;
}
