// Pomocnicze funkcje SMS po stronie klienta: normalizacja numeru, wypełnianie
// szablonu placeholderami i wywołanie serwerowego endpointu /api/sms.

import type { Uczestnik } from "./types";

export interface WiadomoscSMS {
  numer: string;
  tresc: string;
}

export interface WynikSMS {
  numer: string;
  ok: boolean;
  info: string;
}

export interface OdpowiedzSMS {
  wyslane: number;
  wszystkie: number;
  wyniki: WynikSMS[];
}

/** Normalizuje polski numer do formatu międzynarodowego (+48XXXXXXXXX). */
export function normalizujNumer(tel: string | undefined): string | null {
  if (!tel) return null;
  let n = tel.replace(/[\s\-().]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (n.startsWith("+")) return /^\+\d{8,15}$/.test(n) ? n : null;
  n = n.replace(/\D/g, "");
  if (n.length === 11 && n.startsWith("48")) return "+" + n;
  if (n.length === 9) return "+48" + n; // krajowy numer komórkowy
  return null;
}

/** Placeholdery dostępne w szablonie SMS. */
export const POLA_SMS: [string, string][] = [
  ["imie", "Imię uczestnika"],
  ["nazwisko", "Nazwisko uczestnika"],
  ["grupa", "Grupa"],
  ["data", "Data (wpisywana w treści)"],
  ["godzina", "Godzina (wpisywana w treści)"],
  ["nazwa", "Nazwa zajęć (wpisywana w treści)"],
  ["projekt", "Skrót projektu"],
];

/** Wypełnia szablon danymi uczestnika i kontekstu. */
export function wypelnijSzablon(
  szablon: string,
  u: Uczestnik,
  kontekst: Record<string, string> = {},
): string {
  const dane: Record<string, string> = {
    imie: u.imie,
    nazwisko: u.nazwisko,
    grupa: u.grupa && u.grupa !== "—" ? u.grupa : "",
    ...kontekst,
  };
  return szablon.replace(/\{\{(\w+)\}\}/g, (_, k) => dane[k] ?? `{{${k}}}`);
}

/** Wysyła listę wiadomości przez serwerowy endpoint. */
export async function wyslijSMS(
  wiadomosci: WiadomoscSMS[],
  callerId?: string,
): Promise<OdpowiedzSMS> {
  const resp = await fetch("/api/sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wiadomosci, callerId }),
  });
  const dane = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(dane.blad || `Błąd wysyłki (HTTP ${resp.status}).`);
  }
  return dane as OdpowiedzSMS;
}
