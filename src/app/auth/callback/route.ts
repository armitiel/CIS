import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/utils/supabase/env";

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_KEY;

/** Odbiera kod OAuth od Google/Supabase i wymienia go na sesję (cookie). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code && supabaseUrl && supabaseKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // wymiana kodu nie powiodła się — przekaż treść błędu do diagnozy
    const msg = encodeURIComponent(error.message ?? "nieznany");
    return NextResponse.redirect(`${origin}/login?blad=auth&msg=${msg}`);
  }

  // brak kodu / brak konfiguracji
  const powod = !code ? "brak-kodu" : "brak-konfiguracji";
  return NextResponse.redirect(`${origin}/login?blad=${powod}`);
}
