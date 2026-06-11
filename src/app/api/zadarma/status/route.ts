// GET /api/zadarma/status — test połączenia z API Zadarma (saldo konta).
// Klucze pozostają na serwerze (Vercel env) — nigdy nie trafiają do przeglądarki.

import { NextResponse } from "next/server";
import { saldoKonta, ZadarmaBlad } from "@/lib/zadarma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const saldo = await saldoKonta();
    return NextResponse.json({
      ok: true,
      saldo: saldo.balance,
      waluta: saldo.currency,
    });
  } catch (e) {
    const blad =
      e instanceof ZadarmaBlad ? e.message : "Nieznany błąd połączenia";
    return NextResponse.json({ ok: false, blad }, { status: 502 });
  }
}
