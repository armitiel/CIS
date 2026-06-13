// POST /api/analiza-wniosku — analiza treści wniosku o dofinansowanie przez
// Anthropic API (Claude). Klucz Anthropic_API pozostaje na serwerze (Vercel env)
// i nigdy nie trafia do przeglądarki. Zwraca metadane projektu oraz sugerowane
// sekcje katalogu dokumentów. Gdy klucza brak lub API zawiedzie — zwraca
// { ok:false }, a klient korzysta z lokalnej analizy słów-kluczy (fallback).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = "claude-3-5-haiku-latest";

const SEKCJE_OPIS =
  "A=Rekrutacja, B=Ścieżka reintegracji, C=Obecności i wsparcie, D=Kursy zawodowe, E=Świadczenia i wydania, F=Ankiety i wskaźniki, G=Kadra, H=Zarządzanie";

interface WynikAI {
  nazwa?: string;
  nabor?: string;
  wnioskodawca?: string;
  okres?: string;
  typProjektu?: string;
  sekcje?: { sekcja: string; nazwa: string; powod: string }[];
  pewnosc?: number;
}

export async function POST(req: Request) {
  const klucz = process.env.Anthropic_API ?? process.env.ANTHROPIC_API_KEY;
  if (!klucz) {
    return NextResponse.json(
      { ok: false, blad: "Brak klucza Anthropic_API na serwerze." },
      { status: 503 },
    );
  }

  let tekst = "";
  try {
    const body = (await req.json()) as { tekst?: string };
    tekst = (body.tekst ?? "").slice(0, 60000); // limit kontekstu
  } catch {
    return NextResponse.json(
      { ok: false, blad: "Nieprawidłowe żądanie." },
      { status: 400 },
    );
  }
  if (tekst.trim().length < 50) {
    return NextResponse.json(
      { ok: false, blad: "Za mało treści do analizy." },
      { status: 400 },
    );
  }

  const polecenie = [
    "Przeanalizuj treść polskiego wniosku o dofinansowanie z funduszy UE (EFS+).",
    "Zwróć WYŁĄCZNIE obiekt JSON (bez komentarzy, bez bloków markdown) o polach:",
    '{ "nazwa": string, "nabor": string, "wnioskodawca": string, "okres": string,',
    '  "typProjektu": "cis"|"szkoleniowy"|"aktywizacja"|"ogolny",',
    '  "sekcje": [ { "sekcja": "A".."H", "nazwa": string, "powod": string } ],',
    '  "pewnosc": number (0-100) }.',
    `Sekcje katalogu dokumentów: ${SEKCJE_OPIS}.`,
    "Dla każdej sekcji wskaż krótki powód (fraza z wniosku). Pola nieznalezione zostaw jako pusty string. Nie zmyślaj numeru naboru ani dat.",
    "",
    "TREŚĆ WNIOSKU:",
    tekst,
  ].join("\n");

  try {
    const odp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": klucz,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: polecenie }],
      }),
    });

    if (!odp.ok) {
      const tre = await odp.text();
      return NextResponse.json(
        { ok: false, blad: `Anthropic API: ${odp.status} ${tre.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const dane = (await odp.json()) as {
      content?: { type: string; text?: string }[];
    };
    const tekstOdp =
      dane.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    // wytnij ewentualne ```json ... ```
    const jsonTekst = tekstOdp
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    let wynik: WynikAI;
    try {
      wynik = JSON.parse(jsonTekst) as WynikAI;
    } catch {
      return NextResponse.json(
        { ok: false, blad: "Model zwrócił odpowiedź w nieoczekiwanym formacie." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, wynik });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        blad: e instanceof Error ? e.message : "Nieznany błąd połączenia z AI.",
      },
      { status: 502 },
    );
  }
}
