"use client";

// Wysyłka SMS do uczestników (Zadarma). Wybór odbiorców (filtr grupy), szablon
// z placeholderami, podgląd i wynik wysyłki. Numery normalizowane do +48.

import { useMemo, useState } from "react";
import {
  POLA_SMS,
  normalizujNumer,
  wyslijSMS,
  wypelnijSzablon,
  type WynikSMS,
} from "@/lib/sms";
import type { Uczestnik } from "@/lib/types";

export default function WyslijSMS({
  uczestnicy,
  projektSkrot,
  onClose,
}: {
  uczestnicy: Uczestnik[];
  projektSkrot: string;
  onClose: () => void;
}) {
  const [szablon, setSzablon] = useState(
    "Dzień dobry {{imie}}, przypominamy o zajęciach (grupa {{grupa}}). Pozdrawiamy, {{projekt}}.",
  );
  const [grupa, setGrupa] = useState<string>("wszyscy");
  const [wysyla, setWysyla] = useState(false);
  const [wyniki, setWyniki] = useState<WynikSMS[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);

  const grupy = useMemo(
    () =>
      Array.from(
        new Set(
          uczestnicy
            .map((u) => u.grupa)
            .filter((g): g is string => !!g && g !== "—"),
        ),
      ).sort(),
    [uczestnicy],
  );

  // odbiorcy z numerem (po filtrze grupy)
  const odbiorcy = useMemo(() => {
    return uczestnicy
      .filter((u) => grupa === "wszyscy" || u.grupa === grupa)
      .map((u) => ({ u, numer: normalizujNumer(u.sowa?.telefon) }));
  }, [uczestnicy, grupa]);

  const [odznaczeni, setOdznaczeni] = useState<Set<string>>(new Set());
  const wybrani = odbiorcy.filter(
    (o) => o.numer && !odznaczeni.has(o.u.id),
  );

  const kontekst = { projekt: projektSkrot };
  const podglad =
    wybrani.length > 0
      ? wypelnijSzablon(szablon, wybrani[0].u, kontekst)
      : wypelnijSzablon(szablon, uczestnicy[0] ?? ({} as Uczestnik), kontekst);

  function przelacz(id: string) {
    setOdznaczeni((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function wyslij() {
    if (wybrani.length === 0) return;
    setWysyla(true);
    setBlad(null);
    setWyniki(null);
    try {
      const wiadomosci = wybrani.map((o) => ({
        numer: o.numer as string,
        tresc: wypelnijSzablon(szablon, o.u, kontekst),
      }));
      const odp = await wyslijSMS(wiadomosci);
      setWyniki(odp.wyniki);
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się wysłać SMS.");
    } finally {
      setWysyla(false);
    }
  }

  const dlugosc = podglad.length;
  const bezNumeru = odbiorcy.filter((o) => !o.numer).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
            Wyślij SMS do uczestników
          </h3>
          <button onClick={onClose} className="text-faint hover:text-ink" title="Zamknij">
            <span className="material-symbols-rounded notranslate text-[22px]">close</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="th-label">Grupa:</label>
            <select
              value={grupa}
              onChange={(e) => setGrupa(e.target.value)}
              className="cursor-pointer rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              <option value="wszyscy">Wszyscy ({uczestnicy.length})</option>
              {grupy.map((g) => (
                <option key={g} value={g}>
                  Grupa {g}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Odbiorców z numerem: <strong>{wybrani.length}</strong>
              {bezNumeru > 0 && ` · bez numeru: ${bezNumeru}`}
            </span>
          </div>

          <div>
            <label className="th-label mb-1 block">Treść SMS</label>
            <textarea
              value={szablon}
              onChange={(e) => setSzablon(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
              <span>Pola:</span>
              {POLA_SMS.map(([k]) => (
                <button
                  key={k}
                  onClick={() => setSzablon((s) => s + `{{${k}}}`)}
                  className="rounded bg-soft px-1.5 py-0.5 font-mono text-ink-mid hover:bg-hover-row"
                  title="Wstaw pole"
                >
                  {`{{${k}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
            <div className="th-label mb-1">Podgląd (pierwszy odbiorca)</div>
            {podglad}
            <div className="mt-1 text-[11px] text-faint">
              {dlugosc} znaków{" "}
              {dlugosc > 70 &&
                "· uwaga: polskie znaki = do 70 znaków na 1 SMS (dłuższe = kilka SMS)"}
            </div>
          </div>

          {/* lista odbiorców */}
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="max-h-56 overflow-y-auto divide-y divide-line-soft">
              {odbiorcy.map((o) => (
                <div
                  key={o.u.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!!o.numer && !odznaczeni.has(o.u.id)}
                    disabled={!o.numer}
                    onChange={() => przelacz(o.u.id)}
                    className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)] disabled:opacity-40"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {o.u.nazwisko} {o.u.imie}
                  </span>
                  <span className="text-xs text-faint">
                    {o.u.grupa && o.u.grupa !== "—" ? `gr. ${o.u.grupa}` : ""}
                  </span>
                  <span
                    className={`font-mono text-xs ${o.numer ? "text-ink-mid" : "text-red-ink"}`}
                  >
                    {o.numer ?? "brak/niepoprawny numer"}
                  </span>
                </div>
              ))}
              {odbiorcy.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-faint">
                  Brak uczestników w tej grupie.
                </div>
              )}
            </div>
          </div>

          {blad && (
            <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red-ink">
              {blad}
            </div>
          )}

          {wyniki && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="bg-soft px-3 py-2 text-xs font-semibold text-ink-mid">
                Wynik: {wyniki.filter((w) => w.ok).length} z {wyniki.length}{" "}
                wysłanych
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-line-soft">
                {wyniki.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono text-ink-mid">{w.numer}</span>
                    <span
                      className={w.ok ? "text-primary-strong" : "text-red-ink"}
                    >
                      {w.ok ? "✓ wysłano" : `✗ ${w.info}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            SMS-y są płatne (stawka Zadarma per wiadomość). Wysyłaj tylko za
            zgodą uczestników.
          </span>
          <button
            onClick={wyslij}
            disabled={wysyla || wybrani.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">sms</span>
            {wysyla ? "Wysyłam…" : `Wyślij do ${wybrani.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
