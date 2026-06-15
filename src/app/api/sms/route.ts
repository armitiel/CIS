// Serwerowy endpoint wysyłki SMS przez Zadarma API (/v1/sms/send/).
// Sekrety (ZADARMA_KEY, ZADARMA_SECRET) czytane wyłącznie po stronie serwera.
// Podpis żądania zgodny z dokumentacją Zadarmy: base64(hmac_sha1(method +
// paramsStr + md5(paramsStr), secret)); nagłówek Authorization: KEY:sign.

import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = "https://api.zadarma.com";
const METODA = "/v1/sms/send/";

/** Kodowanie wartości jak PHP urlencode (http_build_query, RFC1738). */
function phpUrlencode(s: string): string {
  return encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(
      /[!'()*~]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
}

function paramsString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${phpUrlencode(params[k])}`)
    .join("&");
}

function podpis(paramsStr: string, secret: string): string {
  const md5 = crypto.createHash("md5").update(paramsStr).digest("hex");
  return crypto
    .createHmac("sha1", secret)
    .update(METODA + paramsStr + md5)
    .digest("base64");
}

interface Wiadomosc {
  numer: string;
  tresc: string;
}

interface WynikSMS {
  numer: string;
  ok: boolean;
  info: string;
}

async function wyslijJeden(
  key: string,
  secret: string,
  numer: string,
  tresc: string,
  callerId?: string,
): Promise<WynikSMS> {
  const params: Record<string, string> = { number: numer, message: tresc };
  if (callerId) params.caller_id = callerId;
  const paramsStr = paramsString(params);
  const sign = podpis(paramsStr, secret);

  try {
    const resp = await fetch(BASE + METODA, {
      method: "POST",
      headers: {
        Authorization: `${key}:${sign}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: paramsStr,
    });
    const dane = (await resp.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    const ok = resp.ok && dane.status === "success";
    return {
      numer,
      ok,
      info: ok ? "wysłano" : dane.message || `błąd (HTTP ${resp.status})`,
    };
  } catch (e) {
    return {
      numer,
      ok: false,
      info: e instanceof Error ? e.message : "błąd połączenia z Zadarma",
    };
  }
}

export async function POST(req: Request) {
  const key = process.env.ZADARMA_KEY;
  const secret = process.env.ZADARMA_SECRET;
  if (!key || !secret) {
    return NextResponse.json(
      { blad: "Brak konfiguracji Zadarma (ZADARMA_KEY/SECRET)." },
      { status: 500 },
    );
  }

  let body: { wiadomosci?: Wiadomosc[]; callerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ blad: "Nieprawidłowy JSON." }, { status: 400 });
  }

  const wiadomosci = (body.wiadomosci ?? []).filter(
    (w) => w.numer && w.tresc,
  );
  if (wiadomosci.length === 0) {
    return NextResponse.json(
      { blad: "Brak wiadomości do wysłania." },
      { status: 400 },
    );
  }
  if (wiadomosci.length > 200) {
    return NextResponse.json(
      { blad: "Za dużo wiadomości w jednym żądaniu (limit 200)." },
      { status: 400 },
    );
  }

  const wyniki: WynikSMS[] = [];
  for (const w of wiadomosci) {
    // sekwencyjnie, by nie przekroczyć limitów API
    wyniki.push(
      await wyslijJeden(key, secret, w.numer, w.tresc, body.callerId),
    );
  }

  return NextResponse.json({
    wyslane: wyniki.filter((w) => w.ok).length,
    wszystkie: wyniki.length,
    wyniki,
  });
}
