import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Dopasuj wszystkie ścieżki poza:
     * - _next/static, _next/image (zasoby Next.js)
     * - favicon.ico, pliki graficzne, czcionki i publiczne wzory dokumentów
     */
    "/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?|docx|xlsx)$).*)",
  ],
};
