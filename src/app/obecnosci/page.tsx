"use client";

// Obecności w czterech widokach: dzień / tydzień / miesiąc / świadczenia (E2).
// Realna rejestracja — kliknięcie ustawia znak: obecny → usprawiedliwiony →
// nieobecny → (pusty). Dane zapisywane do Supabase (po zalogowaniu) oraz do
// localStorage. Świadczenia: miesięczne naliczanie z edytowalną stawką.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import { Avatar } from "@/components/ui";
import { useObecnosci, type Znak } from "@/lib/use-obecnosci";

type Widok = "dzien" | "tydzien" | "miesiac" | "swiadczenia";

const ZNACZNIK: Record<
  Znak,
  { ikona: string; tlo: string; kolor: string; label: string }
> = {
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

const DNI_KROTKIE = ["Pn", "Wt", "Śr", "Czw", "Pt", "So", "Nd"];
const DNI_PELNE = [
  "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela",
];
const DNI_ROBOCZE = ["Pn", "Wt", "Śr", "Czw", "Pt"];
const MIESIACE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const MIESIACE_M = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const NASTEPNY: Record<"" | Znak, Znak | null> = {
  "": "p",
  p: "u",
  u: "a",
  a: null,
};

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
function dniRoboczeMiesiaca(rok: number, miesiac: number): Date[] {
  const dni: Date[] = [];
  const d = new Date(rok, miesiac, 1);
  while (d.getMonth() === miesiac) {
    if (dzienTyg(d) < 5) dni.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dni;
}
const fmtPLN = (n: number) =>
  n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Obecnosci() {
  const { projekt, uczestnicy } = useProjekt();
  const { znak, ustaw } = useObecnosci(projekt.id);

  const aktywni = useMemo(
    () => uczestnicy.filter((u) => u.status === "aktywny"),
    [uczestnicy],
  );

  const dzis = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [widok, setWidok] = useState<Widok>("tydzien");
  const [kotwica, setKotwica] = useState<Date>(dzis);

  // stawka świadczenia (PLN/mies.) — zapis per projekt w przeglądarce
  const [stawka, setStawka] = useState<number>(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cis-app:stawka:${projekt.id}`);
      setStawka(raw ? Number(raw) || 0 : 0);
    } catch {
      setStawka(0);
    }
  }, [projekt.id]);
  function zmienStawke(v: number) {
    setStawka(v);
    try {
      localStorage.setItem(`cis-app:stawka:${projekt.id}`, String(v));
    } catch {
      /* limit localStorage */
    }
  }

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

  function cyklUstaw(uczestnikId: string, data: Date) {
    if (dzienTyg(data) >= 5) return; // tylko dni robocze
    const obecny = (znak(uczestnikId, iso(data)) ?? "") as "" | Znak;
    ustaw(uczestnikId, iso(data), NASTEPNY[obecny]);
  }

  // ===== widok tygodniowy =====
  const wiersze = useMemo(
    () =>
      aktywni.map((u) => {
        const dni = Array.from({ length: 5 }, (_, i) =>
          znak(u.id, iso(dodajDni(pon, i))),
        );
        const obecne = dni.filter((d) => d === "p").length;
        const pct = Math.round((obecne / 5) * 100);
        return { u, dni, pct };
      }),
    [aktywni, pon, znak],
  );
  const srednia = wiersze.length
    ? Math.round(wiersze.reduce((s, w) => s + w.pct, 0) / wiersze.length)
    : 0;

  // ===== widok dzienny =====
  const dzienRoboczy = dzienTyg(kotwica) < 5;
  const podsumowanieDnia = (["p", "u", "a"] as Znak[]).map((z) => ({
    z,
    n: aktywni.filter((u) => znak(u.id, iso(kotwica)) === z).length,
  }));

  // ===== widok miesięczny =====
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
    const oznaczeni = aktywni.filter((u) => znak(u.id, iso(data)) !== null);
    if (oznaczeni.length === 0) return null; // brak rejestracji tego dnia
    const obecni = oznaczeni.filter((u) => znak(u.id, iso(data)) === "p").length;
    return Math.round((obecni / oznaczeni.length) * 100);
  }

  // ===== świadczenia (miesiąc kotwicy) =====
  const swiadczenia = useMemo(() => {
    const dni = dniRoboczeMiesiaca(kotwica.getFullYear(), kotwica.getMonth());
    const dniRobocze = dni.length;
    const wiersze = aktywni.map((u) => {
      let p = 0,
        usp = 0,
        nieu = 0;
      for (const d of dni) {
        const z = znak(u.id, iso(d));
        if (z === "p") p++;
        else if (z === "u") usp++;
        else if (z === "a") nieu++;
      }
      const nieoznaczone = dniRobocze - p - usp - nieu;
      const zaliczone = p + usp; // obecne + usprawiedliwione liczą się do świadczenia
      const kwota = dniRobocze > 0 ? (stawka * zaliczone) / dniRobocze : 0;
      const frekwencja = dniRobocze > 0 ? Math.round((p / dniRobocze) * 100) : 0;
      return { u, p, usp, nieu, nieoznaczone, zaliczone, kwota, frekwencja };
    });
    const suma = wiersze.reduce((s, w) => s + w.kwota, 0);
    return { dniRobocze, wiersze, suma };
  }, [aktywni, kotwica, znak, stawka]);

  function eksportCSV() {
    const sep = ";";
    const naglowek = [
      "Uczestnik",
      "Grupa",
      "Dni robocze",
      "Obecne",
      "Usprawiedliwione",
      "Nieusprawiedliwione",
      "Nieoznaczone",
      "Frekwencja %",
      "Kwota świadczenia (PLN)",
    ].join(sep);
    const linie = swiadczenia.wiersze.map((w) =>
      [
        `${w.u.imie} ${w.u.nazwisko}`,
        w.u.grupa,
        swiadczenia.dniRobocze,
        w.p,
        w.usp,
        w.nieu,
        w.nieoznaczone,
        w.frekwencja,
        fmtPLN(w.kwota).replace(/\s/g, ""),
      ].join(sep),
    );
    const tresc = "﻿" + [naglowek, ...linie].join("\r\n");
    const blob = new Blob([tresc], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swiadczenia_${projekt.skrot}_${MIESIACE_M[kotwica.getMonth()]}_${kotwica.getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const WIDOKI: [Widok, string][] = [
    ["dzien", "Dzień"],
    ["tydzien", "Tydzień"],
    ["miesiac", "Miesiąc"],
    ["swiadczenia", "Świadczenia"],
  ];

  const kolorPct = (pct: number) =>
    pct >= 80
      ? "bg-green-soft text-primary-strong"
      : pct >= 50
        ? "bg-amber-soft text-amber-ink"
        : "bg-red-soft text-red-ink";

  const pustaIkona = "radio_button_unchecked";

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
              {widok === "swiadczenia" ? "payments" : "fact_check"}
            </span>
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {etykieta}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* legenda */}
          {widok !== "swiadczenia" && (
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
          )}
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
        (!dzienRoboczy ? (
          <div className="card p-6 text-sm text-faint">
            Weekend — brak zajęć i rejestracji obecności.
          </div>
        ) : (
          <div className="card anim-card-in overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-3.5">
              <span className="th-label">Rejestracja obecności</span>
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
                    {n}
                  </span>
                ))}
              </div>
            </div>
            {aktywni.map((u, i) => {
              const nazwa = `${u.imie} ${u.nazwisko}`;
              const biezacy = znak(u.id, iso(kotwica));
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
                  <div className="flex gap-1.5">
                    {(["p", "u", "a"] as Znak[]).map((z) => {
                      const akt = biezacy === z;
                      return (
                        <button
                          key={z}
                          onClick={() =>
                            ustaw(u.id, iso(kotwica), akt ? null : z)
                          }
                          title={ZNACZNIK[z].label}
                          className="flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-bold transition-all"
                          style={{
                            background: akt ? ZNACZNIK[z].tlo : "transparent",
                            color: akt ? ZNACZNIK[z].kolor : "var(--color-faint)",
                            borderColor: akt
                              ? ZNACZNIK[z].kolor
                              : "var(--color-line-strong)",
                          }}
                        >
                          <span className="material-symbols-rounded notranslate text-[17px]">
                            {ZNACZNIK[z].ikona}
                          </span>
                          <span className="hidden sm:inline">
                            {ZNACZNIK[z].label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
          <div className="grid min-w-[440px] sm:min-w-[640px] grid-cols-[minmax(110px,1.3fr)_repeat(5,minmax(34px,1fr))_96px] sm:grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-1.5 sm:gap-2 border-b border-line px-3 py-3 sm:px-[22px] sm:py-3.5">
            <div className="th-label">Uczestnik</div>
            {DNI_ROBOCZE.map((d, i) => {
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
                className="anim-card-in grid min-w-[440px] sm:min-w-[640px] grid-cols-[minmax(110px,1.3fr)_repeat(5,minmax(34px,1fr))_96px] sm:grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-1.5 sm:gap-2 border-t border-line-soft px-3 py-2.5 sm:px-[22px] sm:py-[13px]"
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
                {dni.map((z, di) => {
                  const data = dodajDni(pon, di);
                  return (
                    <div key={di} className="flex justify-center">
                      <button
                        onClick={() => cyklUstaw(u.id, data)}
                        title={
                          z
                            ? ZNACZNIK[z].label
                            : "Kliknij, aby oznaczyć obecność"
                        }
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] transition-colors hover:ring-2 hover:ring-line-strong"
                        style={{
                          background: z ? ZNACZNIK[z].tlo : "var(--color-soft)",
                        }}
                      >
                        <span
                          className="material-symbols-rounded notranslate text-lg"
                          style={{
                            color: z ? ZNACZNIK[z].kolor : "var(--color-faint)",
                          }}
                        >
                          {z ? ZNACZNIK[z].ikona : pustaIkona}
                        </span>
                      </button>
                    </div>
                  );
                })}
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
                      wTymMiesiacu ? "bg-surface hover:bg-hover-row" : "bg-app"
                    }`}
                    title={
                      wTymMiesiacu && dzienTyg(data) < 5
                        ? "Otwórz dzień do rejestracji"
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
            <span className="ml-auto">
              dni bez rejestracji nie są liczone do frekwencji
            </span>
          </div>
        </div>
      )}

      {/* ===== Widok: ŚWIADCZENIA ===== */}
      {widok === "swiadczenia" && (
        <div className="flex flex-col gap-[18px]">
          <div className="card flex flex-wrap items-end justify-between gap-4 p-[18px]">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="stawka"
                className="th-label"
              >
                Stawka świadczenia (PLN / miesiąc)
              </label>
              <input
                id="stawka"
                type="number"
                min={0}
                step="0.01"
                value={stawka || ""}
                onChange={(e) => zmienStawke(Number(e.target.value) || 0)}
                placeholder="np. 1200"
                className="w-[180px] rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] font-semibold text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
              />
              <span className="text-[11.5px] text-faint">
                pełna kwota za miesiąc; zapis dla projektu „{projekt.skrot}”
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="th-label">Dni robocze w miesiącu</span>
              <span className="font-serif text-2xl font-bold text-ink-strong">
                {swiadczenia.dniRobocze}
              </span>
            </div>
            <button
              onClick={eksportCSV}
              disabled={swiadczenia.wiersze.length === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                download
              </span>
              Eksport CSV
            </button>
          </div>

          <div className="card anim-card-in overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(64px,0.7fr))_minmax(120px,1fr)] items-center gap-2 border-b border-line px-[22px] py-3.5">
              <div className="th-label">Uczestnik</div>
              <div className="th-label text-center">Obecne</div>
              <div className="th-label text-center">Uspr.</div>
              <div className="th-label text-center">Nieuspr.</div>
              <div className="th-label text-center">Nieozn.</div>
              <div className="th-label text-center">Frekw.</div>
              <div className="th-label text-right">Świadczenie</div>
            </div>

            {swiadczenia.wiersze.map(
              ({ u, p, usp, nieu, nieoznaczone, kwota, frekwencja }, i) => {
                const nazwa = `${u.imie} ${u.nazwisko}`;
                return (
                  <div
                    key={u.id}
                    className="anim-card-in grid min-w-[760px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(64px,0.7fr))_minmax(120px,1fr)] items-center gap-2 border-t border-line-soft px-[22px] py-[12px]"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex min-w-0 items-center gap-[11px]">
                      <Avatar nazwa={nazwa} size={32} />
                      <Link
                        href={`/uczestnicy/${u.id}`}
                        className="truncate text-sm font-semibold text-ink hover:text-primary-strong"
                      >
                        {nazwa}
                      </Link>
                    </div>
                    <div className="text-center text-[13.5px] font-bold text-primary-strong">
                      {p}
                    </div>
                    <div className="text-center text-[13.5px] font-semibold text-amber-ink">
                      {usp}
                    </div>
                    <div className="text-center text-[13.5px] font-semibold text-red-ink">
                      {nieu}
                    </div>
                    <div className="text-center text-[13.5px] text-faint">
                      {nieoznaczone}
                    </div>
                    <div className="text-center text-[13px] font-semibold text-ink-mid">
                      {frekwencja}%
                    </div>
                    <div className="text-right font-serif text-[15px] font-bold text-ink-strong">
                      {fmtPLN(kwota)} zł
                    </div>
                  </div>
                );
              },
            )}

            {swiadczenia.wiersze.length === 0 && (
              <div className="px-[22px] py-8 text-center text-sm text-faint">
                Brak aktywnych uczestników w projekcie „{projekt.skrot}”.
              </div>
            )}

            {swiadczenia.wiersze.length > 0 && (
              <div className="flex items-center justify-between border-t border-line bg-hover-row px-[22px] py-[15px]">
                <span className="text-[13.5px] text-muted">
                  Razem do wypłaty w {MIESIACE[kotwica.getMonth()]}{" "}
                  {kotwica.getFullYear()}
                </span>
                <span className="font-serif text-xl font-bold text-primary-strong">
                  {fmtPLN(swiadczenia.suma)} zł
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-faint">
            Wyliczenie pomocnicze: kwota = stawka × (obecne + usprawiedliwione) ÷
            dni robocze. Dni nieoznaczone liczone są jako 0 do czasu rejestracji.
            Zasady naliczania świadczenia integracyjnego należy zweryfikować z
            obowiązującymi przepisami i regulaminem CIS.
          </p>
        </div>
      )}
    </div>
  );
}
