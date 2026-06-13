"use client";

// Harmonogram zajęć (etap E4): realne terminy zapisywane do Supabase.
// Widoki: dzień / tydzień / miesiąc + karty czasu pracy kadry.
// Dodawanie i edycja przez panel; godziny sumowane do kart pracy.

import { useMemo, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import { useZajecia, type Zajecie } from "@/lib/use-zajecia";
import ZajeciaPanel from "@/components/ZajeciaPanel";
import type { KolorZajec } from "@/lib/types";

type Widok = "dzien" | "tydzien" | "miesiac" | "kadra";

const KOLORY: Record<KolorZajec, { tlo: string; tekst: string; akcent: string }> = {
  green: { tlo: "bg-green-soft", tekst: "text-primary-strong", akcent: "var(--color-green-bar)" },
  blue: { tlo: "bg-blue-soft", tekst: "text-blue-ink", akcent: "oklch(0.55 0.09 240)" },
  amber: { tlo: "bg-amber-soft", tekst: "text-amber-ink", akcent: "oklch(0.64 0.11 65)" },
};

const DNI_PELNE = [
  "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela",
];
const DNI_KROTKIE = ["Pn", "Wt", "Śr", "Czw", "Pt", "So", "Nd"];
const MIESIACE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const MIESIACE_M = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function dzienTyg(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function poczatekTygodnia(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - dzienTyg(x));
  x.setHours(0, 0, 0, 0);
  return x;
}
function dodajDni(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function tenSamDzien(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function godziny(z: Zajecie): number {
  if (!z.godzina || !z.godzinaDo) return 0;
  const [h1, m1] = z.godzina.split(":").map(Number);
  const [h2, m2] = z.godzinaDo.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return 0;
  const min = h2 * 60 + m2 - (h1 * 60 + m1);
  return min > 0 ? min / 60 : 0;
}
const fmtGodz = (h: number) =>
  h.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function KartaZajec({
  z,
  delay,
  pelna,
  onClick,
}: {
  z: Zajecie;
  delay: number;
  pelna?: boolean;
  onClick?: () => void;
}) {
  const k = KOLORY[z.kolor];
  const czas = z.godzinaDo ? `${z.godzina}–${z.godzinaDo}` : z.godzina;
  return (
    <button
      onClick={onClick}
      className="anim-card-in w-full rounded-[13px] border border-line bg-surface px-[15px] py-[13px] text-left shadow-[0_1px_2px_oklch(0.4_0.03_150/0.04),0_6px_18px_oklch(0.4_0.03_150/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_oklch(0.4_0.05_150/0.1)]"
      style={{ borderLeft: `4px solid ${k.akcent}`, animationDelay: `${delay}s` }}
    >
      <div className={pelna ? "flex flex-wrap items-center justify-between gap-2" : undefined}>
        <div>
          <div className="mb-1.5 font-serif text-sm font-semibold text-ink-mid">
            {czas}
          </div>
          <div className="text-[14.5px] font-bold leading-[1.25] text-ink">
            {z.nazwa}
          </div>
          {(z.prowadzacy || z.grupa) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {z.prowadzacy && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded notranslate text-[14px]">
                    person
                  </span>
                  {z.prowadzacy}
                </span>
              )}
              {z.grupa && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-rounded notranslate text-[14px]">
                    label
                  </span>
                  grupa {z.grupa}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={pelna ? "text-right" : undefined}>
          {z.typ && (
            <span
              className={`mt-[9px] inline-block rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${k.tlo} ${k.tekst}`}
            >
              {z.typ}
            </span>
          )}
          {z.osob > 0 && (
            <div className="mt-2.5 flex items-center gap-[5px] text-xs text-muted">
              <span className="material-symbols-rounded notranslate text-base">group</span>
              {z.osob} uczestników
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Harmonogram() {
  const { projekt } = useProjekt();
  const { zajecia, zapisz, usun } = useZajecia(projekt.id);

  const dzis = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [widok, setWidok] = useState<Widok>("tydzien");
  const [kotwica, setKotwica] = useState<Date>(dzis);
  const [panel, setPanel] = useState<
    { tryb: "nowy"; data: string } | { tryb: "edytuj"; zajecie: Zajecie } | null
  >(null);

  const wgDnia = useMemo(() => {
    const m: Record<string, Zajecie[]> = {};
    for (const z of zajecia) (m[z.data] ??= []).push(z);
    for (const k of Object.keys(m))
      m[k].sort((a, b) => a.godzina.localeCompare(b.godzina));
    return m;
  }, [zajecia]);
  const zajeciaDnia = (d: Date): Zajecie[] => wgDnia[iso(d)] ?? [];

  function przesun(kierunek: 1 | -1) {
    if (widok === "dzien") setKotwica((k) => dodajDni(k, kierunek));
    else if (widok === "tydzien") setKotwica((k) => dodajDni(k, 7 * kierunek));
    else {
      setKotwica((k) => {
        const x = new Date(k);
        x.setDate(1);
        x.setMonth(x.getMonth() + kierunek);
        return x;
      });
    }
  }

  const pon = poczatekTygodnia(kotwica);
  const pt = dodajDni(pon, 4);
  const etykieta =
    widok === "dzien"
      ? `${DNI_PELNE[dzienTyg(kotwica)]}, ${kotwica.getDate()} ${MIESIACE[kotwica.getMonth()]} ${kotwica.getFullYear()}`
      : widok === "tydzien"
        ? pon.getMonth() === pt.getMonth()
          ? `Tydzień ${pon.getDate()}–${pt.getDate()} ${MIESIACE[pt.getMonth()]} ${pt.getFullYear()}`
          : `Tydzień ${pon.getDate()} ${MIESIACE[pon.getMonth()]} – ${pt.getDate()} ${MIESIACE[pt.getMonth()]} ${pt.getFullYear()}`
        : `${MIESIACE_M[kotwica.getMonth()]} ${kotwica.getFullYear()}`;

  const tygodnieMiesiaca = useMemo(() => {
    const pierwszy = new Date(kotwica.getFullYear(), kotwica.getMonth(), 1);
    const start = poczatekTygodnia(pierwszy);
    const tyg: Date[][] = [];
    let d = start;
    do {
      tyg.push(Array.from({ length: 7 }, (_, i) => dodajDni(d, i)));
      d = dodajDni(d, 7);
    } while (d.getMonth() === kotwica.getMonth());
    return tyg;
  }, [kotwica]);

  // karty pracy: agregacja godzin per prowadzący w miesiącu kotwicy
  const kartyPracy = useMemo(() => {
    const rok = kotwica.getFullYear();
    const mc = kotwica.getMonth();
    const wMiesiacu = zajecia.filter((z) => {
      const d = new Date(z.data + "T00:00:00");
      return d.getFullYear() === rok && d.getMonth() === mc;
    });
    const grupy: Record<string, { zajec: number; godziny: number }> = {};
    for (const z of wMiesiacu) {
      const klucz = z.prowadzacy.trim() || "(nieprzypisane)";
      const g = (grupy[klucz] ??= { zajec: 0, godziny: 0 });
      g.zajec += 1;
      g.godziny += godziny(z);
    }
    const wiersze = Object.entries(grupy)
      .map(([prowadzacy, v]) => ({ prowadzacy, ...v }))
      .sort((a, b) => b.godziny - a.godziny);
    const sumaGodzin = wiersze.reduce((s, w) => s + w.godziny, 0);
    const sumaZajec = wiersze.reduce((s, w) => s + w.zajec, 0);
    return { wiersze, sumaGodzin, sumaZajec };
  }, [zajecia, kotwica]);

  function eksportKartyCSV() {
    const sep = ";";
    const naglowek = ["Prowadzący", "Liczba zajęć", "Suma godzin"].join(sep);
    const linie = kartyPracy.wiersze.map((w) =>
      [w.prowadzacy, w.zajec, fmtGodz(w.godziny).replace(/\s/g, "")].join(sep),
    );
    const tresc = "﻿" + [naglowek, ...linie].join("\r\n");
    const blob = new Blob([tresc], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `karty_pracy_${projekt.skrot}_${MIESIACE_M[kotwica.getMonth()]}_${kotwica.getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const WIDOKI: [Widok, string][] = [
    ["dzien", "Dzień"],
    ["tydzien", "Tydzień"],
    ["miesiac", "Miesiąc"],
    ["kadra", "Karty pracy"],
  ];

  return (
    <div className="max-w-[1280px]">
      {/* Pasek nawigacji */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => przesun(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Poprzedni"
          >
            <span className="material-symbols-rounded notranslate text-xl">chevron_left</span>
          </button>
          <button
            onClick={() => przesun(1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Następny"
          >
            <span className="material-symbols-rounded notranslate text-xl">chevron_right</span>
          </button>
          <button
            onClick={() => setKotwica(dzis)}
            className="rounded-[10px] border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
          >
            Dziś
          </button>
          <span className="ml-2 flex items-center gap-[9px]">
            <span className="material-symbols-rounded notranslate text-[22px] text-primary">
              {widok === "kadra" ? "schedule" : "calendar_month"}
            </span>
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {etykieta}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanel({ tryb: "nowy", data: iso(kotwica) })}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">add</span>
            Dodaj zajęcia
          </button>
          <div className="flex gap-1 rounded-xl bg-soft p-1">
            {WIDOKI.map(([w, label]) => (
              <button
                key={w}
                onClick={() => setWidok(w)}
                className={`rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
                  widok === w
                    ? "bg-surface text-ink-strong shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Widok: DZIEŃ ===== */}
      {widok === "dzien" && (
        <div className="flex max-w-[760px] flex-col gap-3">
          {zajeciaDnia(kotwica).map((z, i) => (
            <KartaZajec
              key={z.id}
              z={z}
              delay={i * 0.06}
              pelna
              onClick={() => setPanel({ tryb: "edytuj", zajecie: z })}
            />
          ))}
          {zajeciaDnia(kotwica).length === 0 && (
            <div className="card p-6 text-sm text-faint">
              Brak zajęć w tym dniu. Kliknij „Dodaj zajęcia", aby zaplanować.
            </div>
          )}
        </div>
      )}

      {/* ===== Widok: TYDZIEŃ ===== */}
      {widok === "tydzien" && (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-5 gap-3.5">
            {Array.from({ length: 5 }, (_, di) => {
              const data = dodajDni(pon, di);
              const lista = zajeciaDnia(data);
              const dzisiaj = tenSamDzien(data, dzis);
              return (
                <div key={di} className="flex flex-col gap-3">
                  <div
                    className={`flex items-center justify-between rounded-[13px] px-3.5 py-[11px] ${
                      dzisiaj ? "bg-green-soft" : "bg-soft"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setKotwica(data);
                        setWidok("dzien");
                      }}
                      className="flex flex-1 flex-col text-left"
                      title="Pokaż dzień"
                    >
                      <span
                        className={`text-sm font-bold ${dzisiaj ? "text-primary-strong" : "text-ink-mid"}`}
                      >
                        {DNI_PELNE[di]}
                      </span>
                      <span
                        className={`text-xs ${dzisiaj ? "text-primary-strong" : "text-faint"}`}
                      >
                        {data.getDate()} {MIESIACE[data.getMonth()].slice(0, 3)}
                        {dzisiaj && " · dziś"}
                      </span>
                    </button>
                    <button
                      onClick={() => setPanel({ tryb: "nowy", data: iso(data) })}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-faint hover:bg-surface hover:text-primary-strong"
                      title="Dodaj zajęcia"
                    >
                      <span className="material-symbols-rounded notranslate text-[18px]">add</span>
                    </button>
                  </div>
                  {lista.map((z, zi) => (
                    <KartaZajec
                      key={z.id}
                      z={z}
                      delay={di * 0.04 + zi * 0.06}
                      onClick={() => setPanel({ tryb: "edytuj", zajecie: z })}
                    />
                  ))}
                  {lista.length === 0 && (
                    <div className="rounded-[13px] border border-dashed border-line-strong px-3 py-4 text-center text-xs text-faint">
                      brak zajęć
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Widok: MIESIĄC ===== */}
      {widok === "miesiac" && (
        <div className="card anim-card-in overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {DNI_KROTKIE.map((d) => (
              <div key={d} className="th-label px-3 py-2.5 text-center">{d}</div>
            ))}
          </div>
          {tygodnieMiesiaca.map((tydzien, ti) => (
            <div
              key={ti}
              className="grid grid-cols-7 border-t border-line-soft first:border-t-0"
            >
              {tydzien.map((data, di) => {
                const wTymMiesiacu = data.getMonth() === kotwica.getMonth();
                const lista = wTymMiesiacu ? zajeciaDnia(data) : [];
                const dzisiaj = tenSamDzien(data, dzis);
                return (
                  <button
                    key={di}
                    onClick={() => {
                      if (!wTymMiesiacu) return;
                      setKotwica(data);
                      setWidok("dzien");
                    }}
                    className={`flex min-h-[92px] cursor-pointer flex-col items-start gap-1 border-l border-line-soft p-2 text-left transition-colors first:border-l-0 ${
                      wTymMiesiacu ? "bg-surface hover:bg-hover-row" : "bg-app"
                    }`}
                    title={wTymMiesiacu ? "Pokaż dzień" : undefined}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-bold ${
                        dzisiaj
                          ? "bg-primary text-white"
                          : wTymMiesiacu
                            ? "text-ink-mid"
                            : "text-faint opacity-50"
                      }`}
                    >
                      {data.getDate()}
                    </span>
                    {lista.slice(0, 2).map((z) => {
                      const k = KOLORY[z.kolor];
                      return (
                        <span
                          key={z.id}
                          className={`w-full truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${k.tlo} ${k.tekst}`}
                        >
                          {z.godzina} {z.nazwa}
                        </span>
                      );
                    })}
                    {lista.length > 2 && (
                      <span className="text-[10.5px] font-semibold text-faint">
                        +{lista.length - 2} więcej
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ===== Widok: KARTY PRACY ===== */}
      {widok === "kadra" && (
        <div className="flex flex-col gap-[18px]">
          <div className="card flex flex-wrap items-center justify-between gap-4 p-[18px]">
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="th-label">Zajęć w miesiącu</span>
                <span className="font-serif text-2xl font-bold text-ink-strong">
                  {kartyPracy.sumaZajec}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="th-label">Suma godzin</span>
                <span className="font-serif text-2xl font-bold text-primary-strong">
                  {fmtGodz(kartyPracy.sumaGodzin)} h
                </span>
              </div>
            </div>
            <button
              onClick={eksportKartyCSV}
              disabled={kartyPracy.wiersze.length === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">download</span>
              Eksport CSV
            </button>
          </div>

          <div className="card anim-card-in overflow-hidden">
            <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center gap-2 border-b border-line px-[22px] py-3.5">
              <div className="th-label">Prowadzący/a</div>
              <div className="th-label text-center">Zajęć</div>
              <div className="th-label text-right">Godziny</div>
            </div>
            {kartyPracy.wiersze.map((w, i) => (
              <div
                key={w.prowadzacy}
                className="anim-card-in grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center gap-2 border-t border-line-soft px-[22px] py-[13px]"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <span className="material-symbols-rounded notranslate text-[20px] text-primary">
                    badge
                  </span>
                  {w.prowadzacy}
                </div>
                <div className="text-center text-[13.5px] font-semibold text-ink-mid">
                  {w.zajec}
                </div>
                <div className="text-right font-serif text-[15px] font-bold text-ink-strong">
                  {fmtGodz(w.godziny)} h
                </div>
              </div>
            ))}
            {kartyPracy.wiersze.length === 0 && (
              <div className="px-[22px] py-8 text-center text-sm text-faint">
                Brak zajęć w {MIESIACE[kotwica.getMonth()]} {kotwica.getFullYear()}.
                Dodaj zajęcia z przypisanym prowadzącym i godzinami.
              </div>
            )}
          </div>

          <p className="text-xs text-faint">
            Godziny liczone z różnicy „od–do" w zajęciach danego miesiąca.
            Zestawienie pomocnicze do kart czasu pracy — zweryfikuj z ewidencją
            i umowami kadry.
          </p>
        </div>
      )}

      {panel && (
        <ZajeciaPanel
          zajecie={panel.tryb === "edytuj" ? panel.zajecie : null}
          domyslnaData={panel.tryb === "nowy" ? panel.data : iso(kotwica)}
          onZapisz={zapisz}
          onUsun={usun}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
