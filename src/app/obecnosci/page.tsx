"use client";

// Obecności w trzech widokach czasowych (dzień / tydzień / miesiąc) —
// nawigacja jak w Harmonogramie. Dane testowe: bieżący tydzień z mocka,
// pozostałe terminy generowane deterministycznie z frekwencji uczestnika.
// Rejestracja realnych obecności i listy do podpisu — etap E2.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import { dniTygodnia, obecnosciTygodnia } from "@/lib/mock-data";
import { Avatar } from "@/components/ui";
import type { Uczestnik } from "@/lib/types";

type Znak = "p" | "u" | "a";
type Widok = "dzien" | "tydzien" | "miesiac";

const ZNACZNIK: Record<Znak, { ikona: string; tlo: string; kolor: string; label: string }> = {
  p: {
    ikona: "check",
    tlo: "oklch(0.94 0.035 150)",
    kolor: "oklch(0.46 0.1 150)",
    label: "obecny",
  },
  u: {
    ikona: "remove",
    tlo: "oklch(0.96 0.045 75)",
    kolor: "oklch(0.55 0.11 62)",
    label: "usprawiedliwiony",
  },
  a: {
    ikona: "close",
    tlo: "oklch(0.95 0.04 25)",
    kolor: "oklch(0.56 0.14 25)",
    label: "nieobecny",
  },
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

/** Deterministyczny „los” 0–99 z tekstu (stabilny między renderami). */
function seed(tekst: string): number {
  let h = 0;
  for (let i = 0; i < tekst.length; i++) {
    h = (h * 31 + tekst.charCodeAt(i)) % 997;
  }
  return h % 100;
}

/**
 * Znacznik obecności uczestnika danego dnia (Pn–Pt).
 * Bieżący tydzień: dane z mocka; inne terminy: deterministycznie z frekwencji.
 */
function znakDnia(u: Uczestnik, data: Date, dzisPon: Date): Znak | null {
  const wd = dzienTyg(data);
  if (wd >= 5) return null; // weekend
  const pon = poczatekTygodnia(data);
  if (tenSamDzien(pon, dzisPon)) {
    const wpis = obecnosciTygodnia.find((o) => o.uczestnikId === u.id);
    if (wpis) return wpis.dni[wd];
  }
  const s = seed(`${u.id}|${iso(data)}`);
  if (s < u.frekwencja) return "p";
  return s % 3 === 0 ? "u" : "a";
}

export default function Obecnosci() {
  const { projekt, uczestnicy } = useProjekt();
  const aktywni = useMemo(
    () => uczestnicy.filter((u) => u.status === "aktywny"),
    [uczestnicy],
  );

  const dzis = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const dzisPon = useMemo(() => poczatekTygodnia(dzis), [dzis]);

  const [widok, setWidok] = useState<Widok>("tydzien");
  const [kotwica, setKotwica] = useState<Date>(dzis);

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

  // wiersze widoku tygodniowego
  const wiersze = useMemo(
    () =>
      aktywni.map((u) => {
        const dni = Array.from(
          { length: 5 },
          (_, i) => znakDnia(u, dodajDni(pon, i), dzisPon) as Znak,
        );
        const pct = Math.round(
          (dni.filter((d) => d === "p").length / 5) * 100,
        );
        return { u, dni, pct };
      }),
    [aktywni, pon, dzisPon],
  );
  const srednia = Math.round(
    wiersze.reduce((s, w) => s + w.pct, 0) / (wiersze.length || 1),
  );

  // dzień: znaczniki per uczestnik
  const dzienZnaki = useMemo(
    () =>
      aktywni.map((u) => ({
        u,
        znak: znakDnia(u, kotwica, dzisPon),
      })),
    [aktywni, kotwica, dzisPon],
  );
  const podsumowanieDnia = (["p", "u", "a"] as Znak[]).map((z) => ({
    z,
    n: dzienZnaki.filter((d) => d.znak === z).length,
  }));

  // miesiąc: tygodnie i % obecności grupy per dzień roboczy
  const tygodnieMiesiaca = useMemo(() => {
    const pierwszy = new Date(kotwica.getFullYear(), kotwica.getMonth(), 1);
    const start = poczatekTygodnia(pierwszy);
    const tygodnie: Date[][] = [];
    let d = start;
    do {
      tygodnie.push(Array.from({ length: 7 }, (_, i) => dodajDni(d, i)));
      d = dodajDni(d, 7);
    } while (d.getMonth() === kotwica.getMonth());
    return tygodnie;
  }, [kotwica]);

  function pctDnia(data: Date): number | null {
    if (dzienTyg(data) >= 5 || aktywni.length === 0) return null;
    const obecni = aktywni.filter(
      (u) => znakDnia(u, data, dzisPon) === "p",
    ).length;
    return Math.round((obecni / aktywni.length) * 100);
  }

  const WIDOKI: [Widok, string][] = [
    ["dzien", "Dzień"],
    ["tydzien", "Tydzień"],
    ["miesiac", "Miesiąc"],
  ];

  const kolorPct = (pct: number) =>
    pct >= 80
      ? "bg-green-soft text-primary-strong"
      : pct >= 50
        ? "bg-amber-soft text-amber-ink"
        : "bg-red-soft text-red-ink";

  return (
    <div className="flex max-w-[1100px] flex-col gap-[18px]">
      {/* Pasek nawigacji + przełącznik widoku */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => przesun(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Poprzedni"
          >
            <span className="material-symbols-rounded notranslate text-xl">
              chevron_left
            </span>
          </button>
          <button
            onClick={() => przesun(1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Następny"
          >
            <span className="material-symbols-rounded notranslate text-xl">
              chevron_right
            </span>
          </button>
          <button
            onClick={() => setKotwica(dzis)}
            className="rounded-[10px] border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
          >
            Dziś
          </button>
          <span className="ml-2 flex items-center gap-[9px]">
            <span className="material-symbols-rounded notranslate text-[22px] text-primary">
              fact_check
            </span>
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {etykieta}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* legenda */}
          <div className="hidden gap-3 text-[12.5px] text-muted lg:flex">
            {(Object.keys(ZNACZNIK) as Znak[]).map((z) => (
              <span key={z} className="flex items-center gap-1.5">
                <span
                  className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-md"
                  style={{ background: ZNACZNIK[z].tlo }}
                >
                  <span
                    className="material-symbols-rounded notranslate text-sm"
                    style={{ color: ZNACZNIK[z].kolor }}
                  >
                    {ZNACZNIK[z].ikona}
                  </span>
                </span>
                {ZNACZNIK[z].label}
              </span>
            ))}
          </div>
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
      {widok === "dzien" &&
        (dzienTyg(kotwica) >= 5 ? (
          <div className="card p-6 text-sm text-faint">
            Weekend — brak zajęć i rejestracji obecności.
          </div>
        ) : (
          <div className="card anim-card-in overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-3.5">
              <span className="th-label">Obecność uczestników</span>
              <div className="flex gap-2">
                {podsumowanieDnia.map(({ z, n }) => (
                  <span
                    key={z}
                    className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px] font-bold"
                    style={{
                      background: ZNACZNIK[z].tlo,
                      color: ZNACZNIK[z].kolor,
                    }}
                  >
                    <span className="material-symbols-rounded notranslate text-[15px]">
                      {ZNACZNIK[z].ikona}
                    </span>
                    {n} {ZNACZNIK[z].label}
                  </span>
                ))}
              </div>
            </div>
            {dzienZnaki.map(({ u, znak }, i) => {
              const nazwa = `${u.imie} ${u.nazwisko}`;
              return (
                <div
                  key={u.id}
                  className="anim-card-in flex items-center justify-between gap-3 border-t border-line-soft px-[22px] py-[11px]"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex min-w-0 items-center gap-[11px]">
                    <Avatar nazwa={nazwa} size={34} />
                    <Link
                      href={`/uczestnicy/${u.id}`}
                      className="truncate text-sm font-semibold text-ink hover:text-primary-strong"
                    >
                      {nazwa}
                    </Link>
                    <span className="text-xs text-faint">grupa {u.grupa}</span>
                  </div>
                  {znak && (
                    <span
                      className="anim-pop inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px] font-bold"
                      style={{
                        background: ZNACZNIK[znak].tlo,
                        color: ZNACZNIK[znak].kolor,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    >
                      <span className="material-symbols-rounded notranslate text-[15px]">
                        {ZNACZNIK[znak].ikona}
                      </span>
                      {ZNACZNIK[znak].label}
                    </span>
                  )}
                </div>
              );
            })}
            {aktywni.length === 0 && (
              <div className="px-[22px] py-8 text-center text-sm text-faint">
                Brak aktywnych uczestników w projekcie „{projekt.skrot}”.
              </div>
            )}
          </div>
        ))}

      {/* ===== Widok: TYDZIEŃ ===== */}
      {widok === "tydzien" && (
        <div className="card anim-card-in overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-2 border-b border-line px-[22px] py-3.5">
            <div className="th-label">Uczestnik</div>
            {dniTygodnia.map((d, i) => {
              const data = dodajDni(pon, i);
              const dzisiaj = tenSamDzien(data, dzis);
              return (
                <div
                  key={d}
                  className={`th-label text-center ${dzisiaj ? "text-primary-strong" : ""}`}
                >
                  {d} {data.getDate()}
                </div>
              );
            })}
            <div className="th-label text-right">Frekwencja</div>
          </div>

          {wiersze.map(({ u, dni, pct }, i) => {
            const nazwa = `${u.imie} ${u.nazwisko}`;
            return (
              <div
                key={u.id}
                className="anim-card-in grid min-w-[640px] grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-2 border-t border-line-soft px-[22px] py-[13px]"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex min-w-0 items-center gap-[11px]">
                  <Avatar nazwa={nazwa} size={34} />
                  <Link
                    href={`/uczestnicy/${u.id}`}
                    className="truncate text-sm font-semibold text-ink hover:text-primary-strong"
                  >
                    {nazwa}
                  </Link>
                </div>
                {dni.map((z, di) => (
                  <div key={di} className="flex justify-center">
                    <span
                      className="anim-pop flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
                      style={{
                        background: ZNACZNIK[z].tlo,
                        animationDelay: `${i * 0.05 + di * 0.03}s`,
                      }}
                    >
                      <span
                        className="material-symbols-rounded notranslate text-lg"
                        style={{ color: ZNACZNIK[z].kolor }}
                      >
                        {ZNACZNIK[z].ikona}
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-[42px] overflow-hidden rounded-[4px] bg-track">
                    <div
                      className="anim-bar h-full rounded-[4px] bg-green-bar"
                      style={{
                        width: `${pct}%`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  </div>
                  <span className="w-[38px] text-right text-[13.5px] font-bold text-ink-mid">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}

          {wiersze.length === 0 && (
            <div className="px-[22px] py-8 text-center text-sm text-faint">
              Brak aktywnych uczestników w projekcie „{projekt.skrot}”.
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line bg-hover-row px-[22px] py-[15px]">
            <span className="text-[13.5px] text-muted">
              Średnia frekwencja grupy w tym tygodniu
            </span>
            <span className="font-serif text-xl font-bold text-primary-strong">
              {srednia}%
            </span>
          </div>
        </div>
      )}

      {/* ===== Widok: MIESIĄC ===== */}
      {widok === "miesiac" && (
        <div className="card anim-card-in overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {DNI_KROTKIE.map((d) => (
              <div key={d} className="th-label px-3 py-2.5 text-center">
                {d}
              </div>
            ))}
          </div>
          {tygodnieMiesiaca.map((tydzien, ti) => (
            <div
              key={ti}
              className="grid grid-cols-7 border-t border-line-soft first:border-t-0"
            >
              {tydzien.map((data, di) => {
                const wTymMiesiacu = data.getMonth() === kotwica.getMonth();
                const pct = wTymMiesiacu ? pctDnia(data) : null;
                const dzisiaj = tenSamDzien(data, dzis);
                return (
                  <button
                    key={di}
                    onClick={() => {
                      if (!wTymMiesiacu || dzienTyg(data) >= 5) return;
                      setKotwica(data);
                      setWidok("dzien");
                    }}
                    className={`flex min-h-[78px] cursor-pointer flex-col items-start gap-1.5 border-l border-line-soft p-2 text-left transition-colors first:border-l-0 ${
                      wTymMiesiacu
                        ? "bg-surface hover:bg-hover-row"
                        : "bg-app"
                    }`}
                    title={
                      wTymMiesiacu && pct !== null
                        ? "Pokaż obecności dnia"
                        : undefined
                    }
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
                    {pct !== null && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${kolorPct(pct)}`}
                      >
                        {pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-4 border-t border-line bg-hover-row px-[22px] py-3 text-xs text-muted">
            <span className="font-semibold">Frekwencja grupy:</span>
            <span className="rounded-md bg-green-soft px-1.5 py-0.5 font-bold text-primary-strong">
              ≥ 80%
            </span>
            <span className="rounded-md bg-amber-soft px-1.5 py-0.5 font-bold text-amber-ink">
              50–79%
            </span>
            <span className="rounded-md bg-red-soft px-1.5 py-0.5 font-bold text-red-ink">
              &lt; 50%
            </span>
            <span className="ml-auto">kliknij dzień, aby zobaczyć szczegóły</span>
          </div>
        </div>
      )}

      <p className="text-xs text-faint">
        Dane testowe (fikcyjne) — bieżący tydzień z danych projektu, pozostałe
        terminy symulowane z frekwencji. Rejestracja obecności na zajęciach i
        listy obecności do podpisu — etap E2.
      </p>
    </div>
  );
}
