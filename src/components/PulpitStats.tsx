"use client";

// Karty statystyk pulpitu z animacją liczenia (count-up) i pierścieniem frekwencji —
// odwzorowanie animacji z projektu graficznego.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Props {
  aktywni: number;
  sciezki: number;
  frekwencja: number;
  braki: number;
  sredniPostep: number;
  limityTekst: string;
}

export default function PulpitStats({
  aktywni,
  sciezki,
  frekwencja,
  braki,
  sredniPostep,
  limityTekst,
}: Props) {
  const [k, setK] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const t0 = performance.now();
    const dur = 1100;
    const ease = (p: number) => 1 - Math.pow(1 - p, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setK(ease(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const cU = Math.round(aktywni * k);
  const cS = Math.round(sciezki * k);
  const cO = Math.round(frekwencja * k);
  const cD = Math.round(braki * k);

  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      {/* Uczestnicy aktywni */}
      <Link
        href="/uczestnicy"
        className="card card-hover anim-card-in block p-5"
      >
        <div className="mb-[15px] flex h-11 w-11 items-center justify-center rounded-[13px] bg-green-soft">
          <span className="material-symbols-rounded notranslate text-[25px] text-primary-strong">
            groups
          </span>
        </div>
        <div className="font-serif text-[40px] font-semibold leading-none text-ink-strong">
          {cU}
        </div>
        <div className="mt-[7px] text-sm text-muted">Uczestnicy aktywni</div>
        <div className="mt-[13px] flex items-center gap-[5px] text-[12.5px] font-bold text-primary-strong">
          <span className="material-symbols-rounded notranslate text-[17px]">
            trending_up
          </span>
          {limityTekst}
        </div>
      </Link>

      {/* Aktywne ścieżki */}
      <Link
        href="/sciezki"
        className="card card-hover anim-card-in block p-5"
        style={{ animationDelay: "0.07s" }}
      >
        <div className="mb-[15px] flex h-11 w-11 items-center justify-center rounded-[13px] bg-blue-soft">
          <span className="material-symbols-rounded notranslate text-[25px] text-blue-ink">
            route
          </span>
        </div>
        <div className="font-serif text-[40px] font-semibold leading-none text-ink-strong">
          {cS}
        </div>
        <div className="mt-[7px] text-sm text-muted">Aktywne ścieżki IŚR</div>
        <div className="mt-3.5 h-[7px] overflow-hidden rounded-[4px] bg-track">
          <div
            className="anim-bar h-full rounded-[4px] bg-green-bar"
            style={{ width: `${sredniPostep}%`, animationDelay: "0.2s" }}
          />
        </div>
      </Link>

      {/* Średnia obecność — pierścień */}
      <Link
        href="/obecnosci"
        className="card card-hover anim-card-in block p-5"
        style={{ animationDelay: "0.14s" }}
      >
        <div className="mb-[15px] flex h-11 w-11 items-center justify-center rounded-[13px] bg-green-soft">
          <span className="material-symbols-rounded notranslate text-[25px] text-primary-strong">
            event_available
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative h-[66px] w-[66px] shrink-0 rounded-full"
            style={{
              background: `conic-gradient(oklch(0.55 0.11 150) ${cO * 3.6}deg, var(--color-track) ${cO * 3.6}deg)`,
            }}
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-surface font-serif text-[17px] font-bold text-ink">
              {cO}%
            </div>
          </div>
          <div>
            <div className="text-sm text-muted">Średnia obecność</div>
            <div className="mt-[5px] text-[12.5px] font-bold text-primary-strong">
              w bieżącym tygodniu
            </div>
          </div>
        </div>
      </Link>

      {/* Teczki z brakami */}
      <Link
        href="/dokumenty"
        className="card card-hover anim-card-in block p-5"
        style={{ animationDelay: "0.21s" }}
      >
        <div className="mb-[15px] flex h-11 w-11 items-center justify-center rounded-[13px] bg-amber-soft">
          <span className="material-symbols-rounded notranslate text-[25px] text-amber-ink">
            folder_off
          </span>
        </div>
        <div className="font-serif text-[40px] font-semibold leading-none text-ink-strong">
          {cD}
        </div>
        <div className="mt-[7px] text-sm text-muted">Teczki z brakami</div>
        <div className="mt-[13px] flex items-center gap-[5px] text-[12.5px] font-bold text-amber-ink">
          <span className="material-symbols-rounded notranslate text-[17px]">
            priority_high
          </span>
          wymaga uzupełnienia
        </div>
      </Link>
    </div>
  );
}
