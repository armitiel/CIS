"use client";

// Wysyłka SMS do uczestników (Zadarma) z treścią dynamiczną powiązaną z
// harmonogramem. Pola dynamiczne ({{...}}) prezentowane jako klikalne kapsułki,
// wstawiane w miejscu kursora. Wybór terminu z harmonogramu zasila pola
// {{data}}, {{godzina}}, {{nazwa}}. Numery normalizowane do +48.

import { useMemo, useRef, useState } from "react";
import {
  normalizujNumer,
  wyslijSMS,
  wypelnijSzablon,
  type WynikSMS,
} from "@/lib/sms";
import { useProjekt } from "@/components/ProjektProvider";
import { useZajecia } from "@/lib/use-zajecia";
import type { Uczestnik } from "@/lib/types";

type GrupaPola = "harmonogram" | "uczestnik" | "projekt";

// Metadane pól dynamicznych: etykieta + przynależność (kolor kapsułki).
const POLA_META: Record<string, { label: string; grupa: GrupaPola }> = {
  data: { label: "data", grupa: "harmonogram" },
  godzina: { label: "godzina", grupa: "harmonogram" },
  nazwa: { label: "nazwa zajęć", grupa: "harmonogram" },
  imie: { label: "imię", grupa: "uczestnik" },
  nazwisko: { label: "nazwisko", grupa: "uczestnik" },
  grupa: { label: "grupa", grupa: "uczestnik" },
  projekt: { label: "projekt", grupa: "projekt" },
};

const KOLOR_GRUPY: Record<GrupaPola, string> = {
  harmonogram: "bg-blue-soft text-blue-ink",
  uczestnik: "bg-green-soft text-primary-strong",
  projekt: "bg-amber-soft text-amber-ink",
};

const POLA_HARMONOGRAM = ["data", "godzina", "nazwa"];

const DOW_PL = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const p2 = (n: number) => String(n).padStart(2, "0");
function fmtData(iso: string): string {
  const d = parseISO(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function etykietaTerminu(z: {
  data: string;
  godzina: string;
  nazwa: string;
  grupa: string;
  seria?: string | null;
}): string {
  const d = parseISO(z.data);
  const dzien = `${DOW_PL[d.getDay()]} ${p2(d.getDate())}.${p2(d.getMonth() + 1)}`;
  const nazwa = z.nazwa?.trim() || "zajęcia";
  const krotka = nazwa.length > 22 ? `${nazwa.slice(0, 21).trimEnd()}…` : nazwa;
  const cykl = z.seria ? "🔁 cykl." : "1× jedn.";
  const grupa = z.grupa && z.grupa !== "—" ? ` · gr. ${z.grupa}` : "";
  return `${dzien} ${z.godzina || "—"} · ${krotka} · ${cykl}${grupa}`;
}

// Rozbija treść na segmenty tekstu i pola {{...}} (do podglądu z kapsułkami).
function tokenizuj(s: string): { typ: "txt" | "pole"; val: string }[] {
  const parts: { typ: "txt" | "pole"; val: string }[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ typ: "txt", val: s.slice(last, m.index) });
    parts.push({ typ: "pole", val: m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ typ: "txt", val: s.slice(last) });
  return parts;
}

export default function WyslijSMS({
  uczestnicy,
  projektSkrot,
  onClose,
}: {
  uczestnicy: Uczestnik[];
  projektSkrot: string;
  onClose: () => void;
}) {
  const { projekt } = useProjekt();
  const { zajecia } = useZajecia(projekt.id);

  const [szablon, setSzablon] = useState(
    "Dzień dobry {{imie}}, przypominamy o zajęciach „{{nazwa}}” dnia {{data}} o {{godzina}} (grupa {{grupa}}). Pozdrawiamy, {{projekt}}.",
  );
  const [grupa, setGrupa] = useState<string>("wszyscy");
  const [terminId, setTerminId] = useState<string>("");
  const [wysyla, setWysyla] = useState(false);
  const [wyniki, setWyniki] = useState<WynikSMS[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Terminy z harmonogramu posortowane rosnąco (najbliższe na górze listy).
  const terminy = useMemo(
    () =>
      [...zajecia].sort((a, b) =>
        a.data === b.data
          ? a.godzina.localeCompare(b.godzina)
          : a.data.localeCompare(b.data),
      ),
    [zajecia],
  );
  const termin = useMemo(
    () => terminy.find((z) => z.id === terminId) ?? null,
    [terminy, terminId],
  );

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

  // Kontekst do podstawień: projekt zawsze; data/godzina/nazwa z terminu.
  const kontekst = useMemo(() => {
    const k: Record<string, string> = { projekt: projektSkrot };
    if (termin) {
      k.data = fmtData(termin.data);
      k.godzina = termin.godzinaDo
        ? `${termin.godzina}–${termin.godzinaDo}`
        : termin.godzina;
      k.nazwa = termin.nazwa;
    }
    return k;
  }, [termin, projektSkrot]);

  // odbiorcy z numerem (po filtrze grupy)
  const odbiorcy = useMemo(() => {
    return uczestnicy
      .filter((u) => grupa === "wszyscy" || u.grupa === grupa)
      .map((u) => ({ u, numer: normalizujNumer(u.sowa?.telefon) }));
  }, [uczestnicy, grupa]);

  const [odznaczeni, setOdznaczeni] = useState<Set<string>>(new Set());
  const wybrani = odbiorcy.filter((o) => o.numer && !odznaczeni.has(o.u.id));

  // Pola użyte w szablonie + walidacja powiązania z harmonogramem.
  const polaWSzablonie = useMemo(
    () => Array.from(new Set([...szablon.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))),
    [szablon],
  );
  const uzyteHarmonogram = polaWSzablonie.filter((k) =>
    POLA_HARMONOGRAM.includes(k),
  );
  const nieznanePola = polaWSzablonie.filter((k) => !POLA_META[k]);
  const wymagaTerminu = uzyteHarmonogram.length > 0 && !termin;

  const odbiorcaPodgladu = wybrani[0]?.u ?? uczestnicy[0];
  const podglad =
    wybrani.length > 0
      ? wypelnijSzablon(szablon, wybrani[0].u, kontekst)
      : wypelnijSzablon(szablon, uczestnicy[0] ?? ({} as Uczestnik), kontekst);

  // wartości pól do podglądu z kolorowymi kapsułkami (pierwszy odbiorca)
  const danePodgladu: Record<string, string> = { ...kontekst };
  if (odbiorcaPodgladu) {
    danePodgladu.imie = odbiorcaPodgladu.imie;
    danePodgladu.nazwisko = odbiorcaPodgladu.nazwisko;
    danePodgladu.grupa =
      odbiorcaPodgladu.grupa && odbiorcaPodgladu.grupa !== "—"
        ? odbiorcaPodgladu.grupa
        : "";
  }

  function wstawPole(k: string) {
    const token = `{{${k}}}`;
    const ta = taRef.current;
    if (!ta) {
      setSzablon((s) => s + token);
      return;
    }
    const start = ta.selectionStart ?? szablon.length;
    const end = ta.selectionEnd ?? szablon.length;
    setSzablon(szablon.slice(0, start) + token + szablon.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function przelacz(id: string) {
    setOdznaczeni((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function wyslij() {
    if (wybrani.length === 0 || wymagaTerminu) return;
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
  const grupaTerminu = termin?.grupa && termin.grupa !== "—" ? termin.grupa : "";

  const pole =
    "rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

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

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-4">
          {/* Powiązanie z harmonogramem */}
          <div className="rounded-xl border border-line bg-soft/50 p-3.5">
            <label className="th-label mb-1 block">
              <span className="material-symbols-rounded notranslate align-middle text-[16px] text-blue-ink">
                event
              </span>{" "}
              Termin z harmonogramu
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                value={terminId}
                onChange={(e) => setTerminId(e.target.value)}
                className={`w-full min-w-0 cursor-pointer sm:flex-1 ${pole}`}
              >
                <option value="">— nie podpinaj (pola harmonogramu puste) —</option>
                {terminy.map((z) => (
                  <option key={z.id} value={z.id}>
                    {etykietaTerminu(z)}
                  </option>
                ))}
              </select>
              {grupaTerminu && grupa !== grupaTerminu && (
                <button
                  onClick={() => setGrupa(grupaTerminu)}
                  className="shrink-0 rounded-lg border border-blue-ink/30 bg-blue-soft px-2.5 py-1.5 text-xs font-semibold text-blue-ink hover:opacity-90"
                >
                  Wyślij do grupy {grupaTerminu}
                </button>
              )}
            </div>
            {termin && (
              <p className="mt-2 text-[12px] text-muted">
                Podstawi się: data <strong>{kontekst.data}</strong>, godzina{" "}
                <strong>{kontekst.godzina}</strong>, nazwa „
                <strong>{kontekst.nazwa}</strong>".
              </p>
            )}
            {terminy.length === 0 && (
              <p className="mt-2 text-[12px] text-faint">
                Brak zajęć w harmonogramie tego projektu — dodaj je w module
                Harmonogram, aby podpiąć datę i godzinę.
              </p>
            )}
          </div>

          {/* Filtr grupy + liczba odbiorców */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="th-label">Grupa:</label>
            <select
              value={grupa}
              onChange={(e) => setGrupa(e.target.value)}
              className={`cursor-pointer ${pole}`}
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

          {/* Pola dynamiczne — jeden rząd kapsułek (kliknij, aby wstawić) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="th-label">Wstaw pole:</span>
            {Object.keys(POLA_META).map((k) => (
              <button
                key={k}
                onClick={() => wstawPole(k)}
                title={`Wstaw {{${k}}}`}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-opacity hover:opacity-80 ${KOLOR_GRUPY[POLA_META[k].grupa]}`}
              >
                {POLA_META[k].label}
              </button>
            ))}
          </div>

          {/* Treść SMS */}
          <div>
            <label className="th-label mb-1 block">Treść SMS</label>
            <textarea
              ref={taRef}
              value={szablon}
              onChange={(e) => setSzablon(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
            />
          </div>

          {/* Wypełniony podgląd z kolorowymi kapsułkami pól */}
          <div className="rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
            <div className="th-label mb-1">Podgląd (pierwszy odbiorca)</div>
            <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 leading-relaxed">
              {tokenizuj(szablon).map((t, i) =>
                t.typ === "txt" ? (
                  <span key={i} className="whitespace-pre-wrap">
                    {t.val}
                  </span>
                ) : (
                  <span
                    key={i}
                    title={POLA_META[t.val] ? `{{${t.val}}}` : "Nieznane pole"}
                    className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                      POLA_META[t.val]
                        ? KOLOR_GRUPY[POLA_META[t.val].grupa]
                        : "bg-red-soft text-red-ink"
                    }`}
                  >
                    {danePodgladu[t.val] || (POLA_META[t.val] ? "—" : `${t.val}?`)}
                  </span>
                ),
              )}
            </div>
            <div className="mt-1 text-[11px] text-faint">
              {dlugosc} znaków{" "}
              {dlugosc > 70 &&
                "· uwaga: polskie znaki = do 70 znaków na 1 SMS (dłuższe = kilka SMS)"}
            </div>
          </div>

          {/* Ostrzeżenia walidacyjne */}
          {wymagaTerminu && (
            <div className="rounded-xl bg-amber-soft/50 px-4 py-2.5 text-sm text-amber-ink">
              Treść używa pól z harmonogramu ({uzyteHarmonogram.join(", ")}), ale
              nie wybrano terminu — wybierz termin powyżej, aby je uzupełnić.
            </div>
          )}
          {nieznanePola.length > 0 && (
            <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red-ink">
              Nieznane pola w treści: {nieznanePola.map((k) => `{{${k}}}`).join(", ")}.
              Zostaną wysłane dosłownie — usuń je lub użyj kapsułek powyżej.
            </div>
          )}

          {/* Lista odbiorców */}
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="max-h-[44vh] min-h-[120px] divide-y divide-line-soft overflow-y-auto">
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
              <div className="max-h-40 divide-y divide-line-soft overflow-y-auto">
                {wyniki.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono text-ink-mid">{w.numer}</span>
                    <span className={w.ok ? "text-primary-strong" : "text-red-ink"}>
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
            SMS-y są płatne (stawka Zadarma per wiadomość). Wysyłaj tylko za zgodą
            uczestników.
          </span>
          <button
            onClick={wyslij}
            disabled={wysyla || wybrani.length === 0 || wymagaTerminu}
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
