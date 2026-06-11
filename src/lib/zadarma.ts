// Klient API Zadarma (telefonia/SMS/audio) — WYŁĄCZNIE po stronie serwera.
// Klucze: ZADARMA_KEY / ZADARMA_SECRET (Vercel env, lokalnie .env.local).
// Podpis żądania wg dokumentacji Zadarma:
//   sign = base64( hex( hmac_sha1( metoda + query + md5(query), SECRET ) ) )
//   nagłówek: Authorization: KEY:sign
// Planowane zastosowanie: odpowiedzi audio do formularzy (nagrania rozmów,
// oddzwanianie do uczestników) — na razie tylko połączenie i status konta.

import crypto from "crypto";

const API = "https://api.zadarma.com";

export class ZadarmaBlad extends Error {}

function podpisz(metoda: string, query: string, secret: string): string {
  const md5 = crypto.createHash("md5").update(query).digest("hex");
  const hex = crypto
    .createHmac("sha1", secret)
    .update(metoda + query + md5)
    .digest("hex");
  return Buffer.from(hex).toString("base64");
}

/** Wywołanie metody API Zadarma (GET), np. zadarma("/v1/info/balance/"). */
export async function zadarma<T = Record<string, unknown>>(
  metoda: string,
  params: Record<string, string> = {},
): Promise<T> {
  const key = process.env.ZADARMA_KEY;
  const secret = process.env.ZADARMA_SECRET;
  if (!key || !secret) {
    throw new ZadarmaBlad(
      "Brak kluczy ZADARMA_KEY/ZADARMA_SECRET w zmiennych środowiskowych",
    );
  }
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");
  const url = `${API}${metoda}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `${key}:${podpisz(metoda, query, secret)}` },
    cache: "no-store",
  });
  const dane = (await res.json()) as T & { status?: string; message?: string };
  if (!res.ok || dane.status === "error") {
    throw new ZadarmaBlad(
      `Zadarma ${metoda}: ${dane.message ?? `HTTP ${res.status}`}`,
    );
  }
  return dane;
}

/** Test połączenia: saldo i waluta konta. */
export async function saldoKonta() {
  return zadarma<{ balance: number; currency: string }>("/v1/info/balance/");
}
