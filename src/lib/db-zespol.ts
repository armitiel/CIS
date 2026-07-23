import { createClient } from "@/utils/supabase/client";
import {
  normalizujEmailZespolu,
  poprawnyEmailZespolu,
} from "./zespol-reguly";

export const ROLE_DOSTEPU = ["administrator", "pracownik"] as const;
export type RolaDostepu = (typeof ROLE_DOSTEPU)[number];

export interface CzlonekZespolu {
  email: string;
  rola: RolaDostepu;
  aktywny: boolean;
  nazwa: string | null;
  dodany: string;
}

function klient() {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase nie jest skonfigurowane.");
  return supabase;
}

export async function pobierzMojeUprawnienia(): Promise<CzlonekZespolu | null> {
  const supabase = klient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data, error } = await supabase
    .from("zespol")
    .select("email,rola,aktywny,nazwa,dodany")
    .eq("email", normalizujEmailZespolu(user.email))
    .maybeSingle();
  if (error) throw error;
  return data as CzlonekZespolu | null;
}

export async function pobierzZespol(): Promise<CzlonekZespolu[]> {
  const { data, error } = await klient()
    .from("zespol")
    .select("email,rola,aktywny,nazwa,dodany")
    .order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CzlonekZespolu[];
}

export async function dodajPracownika(
  email: string,
  rola: RolaDostepu,
  nazwa?: string,
): Promise<void> {
  const adres = normalizujEmailZespolu(email);
  if (!poprawnyEmailZespolu(adres)) throw new Error("Wpisz poprawny adres e-mail.");
  const { error } = await klient().from("zespol").upsert(
    { email: adres, rola, aktywny: true, nazwa: nazwa?.trim() || null },
    { onConflict: "email" },
  );
  if (error) throw error;
}

export async function zmienPracownika(
  email: string,
  zmiany: Partial<Pick<CzlonekZespolu, "rola" | "aktywny" | "nazwa">>,
): Promise<void> {
  const { error } = await klient()
    .from("zespol")
    .update(zmiany)
    .eq("email", normalizujEmailZespolu(email));
  if (error) throw error;
}
