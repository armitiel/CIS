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
  const publiczna =
    sciezka === "/login" ||
    sciezka.startsWith("/auth") ||
    sciezka.startsWith("/api");
  if (!user && !publiczna) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // zalogowany na /login → przekieruj na pulpit
  if (user && sciezka === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
