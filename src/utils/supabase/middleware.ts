import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Odświeża sesję Supabase przy każdym żądaniu (zalecane dla SSR). */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  // brak konfiguracji env → przepuść żądanie bez ingerencji
  if (!SUPABASE_URL || !SUPABASE_KEY) return supabaseResponse;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // wywołanie odświeża token, jeśli wygasł
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // brama dostępu: niezalogowany → /login (poza ścieżkami publicznymi)
  const sciezka = request.nextUrl.pathname;
  const api = sciezka.startsWith("/api");
  const publiczna =
    sciezka === "/login" ||
    sciezka === "/brak-dostepu" ||
    sciezka.startsWith("/auth");
  if (!user && !publiczna) {
    if (api) {
      return NextResponse.json(
        { blad: "Wymagane zalogowanie." },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let maDostep = false;
  if (user?.email) {
    const { data } = await supabase
      .from("zespol")
      .select("email")
      .eq("email", user.email.trim().toLowerCase())
      .eq("aktywny", true)
      .maybeSingle();
    maDostep = !!data;
  }

  if (user && !maDostep && !publiczna) {
    if (api) {
      return NextResponse.json(
        { blad: "Brak dostepu do aplikacji." },
        { status: 403 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/brak-dostepu";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    maDostep &&
    (sciezka === "/login" || sciezka === "/brak-dostepu")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
