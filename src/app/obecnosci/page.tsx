"use client";

import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import {
  dniTygodnia,
  obecnosciTygodnia,
  tydzienEtykieta,
} from "@/lib/mock-data";
import { Avatar } from "@/components/ui";
import type { Uczestnik } from "@/lib/types";

type Znak = "p" | "u" | "a";

const ZNACZNIK: Record<Znak, { ikona: string; tlo: string; kolor: string }> = {
  p: {
    ikona: "check",
    tlo: "oklch(0.94 0.035 150)",
    kolor: "oklch(0.46 0.1 150)",
  },
  u: {
    ikona: "remove",
    tlo: "oklch(0.96 0.045 75)",
    kolor: "oklch(0.55 0.11 62)",
  },
  a: {
    ikona: "close",
    tlo: "oklch(0.95 0.04 25)",
    kolor: "oklch(0.56 0.14 25)",
  },
};

/** Dni tygodnia uczestnika: z danych testowych albo wyprowadzone z frekwencji. */
function dniDla(u: Uczestnik): Znak[] {
  const wpis = obecnosciTygodnia.find((o) => o.uczestnikId === u.id);
  if (wpis) return wpis.dni;
  const obecne = Math.round((u.frekwencja / 100) * 5);
  return Array.from({ length: 5 }, (_, i) =>
    i < obecne ? "p" : i === obecne && u.frekwencja >= 50 ? "u" : "a",
  );
}

export default function Obecnosci() {
  const { projekt, uczestnicy } = useProjekt();
  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");

  const wiersze = aktywni.map((u) => {
    const dni = dniDla(u);
    const pct = Math.round(
      (dni.filter((d) => d === "p").length / dni.length) * 100,
    );
    return { u, dni, pct };
  });
  const srednia = Math.round(
    wiersze.reduce((s, w) => s + w.pct, 0) / (wiersze.length || 1),
  );

  return (
    <div className="flex max-w-[1100px] flex-col gap-[18px]">
      {/* Pasek tygodnia + legenda */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-surface px-5 py-[13px] shadow-[0_1px_2px_oklch(0.4_0.03_150/0.04)]">
        <div className="flex items-center gap-[11px]">
          <span className="material-symbols-rounded text-[22px] text-primary">
            calendar_month
          </span>
          <span className="font-serif text-[17px] font-semibold text-ink-strong">
            {tydzienEtykieta}
          </span>
        </div>
        <div className="flex gap-4 text-[12.5px] text-muted">
          {(
            [
              ["p", "obecny"],
              ["u", "usprawiedliwiony"],
              ["a", "nieobecny"],
            ] as [Znak, string][]
          ).map(([z, label]) => (
            <span key={z} className="flex items-center gap-1.5">
              <span
                className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-md"
                style={{ background: ZNACZNIK[z].tlo }}
              >
                <span
                  className="material-symbols-rounded text-sm"
                  style={{ color: ZNACZNIK[z].kolor }}
                >
                  {ZNACZNIK[z].ikona}
                </span>
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="card anim-card-in overflow-hidden">
        <div className="grid grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-2 border-b border-line px-[22px] py-3.5">
          <div className="th-label">Uczestnik</div>
          {dniTygodnia.map((d) => (
            <div key={d} className="th-label text-center">
              {d}
            </div>
          ))}
          <div className="th-label text-right">Frekwencja</div>
        </div>

        {wiersze.map(({ u, dni, pct }, i) => {
          const nazwa = `${u.imie} ${u.nazwisko}`;
          return (
            <div
              key={u.id}
              className="anim-card-in grid grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(56px,1fr))_120px] items-center gap-2 border-t border-line-soft px-[22px] py-[13px]"
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
                      className="material-symbols-rounded text-lg"
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

      <p className="text-xs text-faint">
        Dane testowe (fikcyjne). Rejestracja obecności na zajęciach i listy
        obecności do podpisu — etap E2.
      </p>
    </div>
  );
}
