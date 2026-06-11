// Wspólne klocki interfejsu zgodne z projektem graficznym (handoff Claude Design).
// Komponenty czysto prezentacyjne — działają w komponentach serwerowych i klienckich.

import type { TypSciezki, StatusUdzialu } from "@/lib/types";
import { etapyNazwy } from "@/lib/mock-data";

const HUES = [200, 152, 32, 262, 96, 330, 182, 52];

export function hueDla(nazwa: string): number {
  let s = 0;
  for (let i = 0; i < nazwa.length; i++) s += nazwa.charCodeAt(i);
  return HUES[s % HUES.length];
}

export function inicjaly(nazwa: string): string {
  return nazwa
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  nazwa,
  size = 40,
}: {
  nazwa: string;
  size?: number;
}) {
  const h = hueDla(nazwa);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `oklch(0.93 0.045 ${h})`,
        color: `oklch(0.42 0.1 ${h})`,
      }}
    >
      {inicjaly(nazwa)}
    </div>
  );
}

export function Pasek({
  pct,
  delay = 0,
  kolor,
  wysokosc = 7,
}: {
  pct: number;
  delay?: number;
  kolor?: string;
  wysokosc?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-[4px] bg-track"
      style={{ height: wysokosc }}
    >
      <div
        className="anim-bar h-full rounded-[4px]"
        style={{
          width: `${pct}%`,
          background:
            kolor ??
            "linear-gradient(90deg, oklch(0.6 0.1 152), oklch(0.52 0.1 150))",
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

/** Pigułka typu ścieżki: IPZS (zielona) / IPR (niebieska). */
export function SciezkaPill({ sciezka }: { sciezka: TypSciezki }) {
  const ipzs = sciezka === "IPZS";
  return (
    <span
      className={`inline-block rounded-full px-[9px] py-0.5 text-[11.5px] font-semibold ${
        ipzs ? "bg-green-soft text-primary-strong" : "bg-blue-soft text-blue-ink"
      }`}
    >
      {ipzs ? "IPZS · bezrobotny" : "IPR · bierny zawodowo"}
    </span>
  );
}

const STATUS_STYL: Record<StatusUdzialu, string> = {
  aktywny: "bg-green-soft text-primary-strong",
  rezerwowy: "bg-amber-soft text-amber-ink",
  zakończył: "bg-teal-soft text-teal-ink",
  przerwał: "bg-red-soft text-red-ink",
};

export function StatusPill({ status }: { status: StatusUdzialu }) {
  return (
    <span
      className={`inline-block rounded-full px-[11px] py-[5px] text-xs font-bold ${STATUS_STYL[status]}`}
    >
      {status}
    </span>
  );
}

/** Badge kompletności teczki. */
export function BrakiPill({ braki }: { braki: number }) {
  const komplet = braki === 0;
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full px-[11px] py-[5px] text-[12.5px] font-bold ${
        komplet
          ? "bg-green-soft text-primary-strong"
          : "bg-amber-soft text-amber-ink"
      }`}
    >
      {komplet ? "Komplet" : `${braki} do uzup.`}
    </span>
  );
}

/** Badge etapu ścieżki (Diagnoza/IŚR/Realizacja/Zakończenie). */
const ETAP_BADGE = [
  "bg-blue-soft text-blue-ink",
  "bg-amber-soft text-amber-ink",
  "bg-green-soft text-primary-strong",
  "bg-teal-soft text-teal-ink",
];

export function EtapBadge({ etap }: { etap: number }) {
  return (
    <span
      className={`rounded-full px-3 py-[5px] text-xs font-bold ${ETAP_BADGE[etap]}`}
    >
      {etapyNazwy[etap]}
    </span>
  );
}

/** Stepper 4 etapów ścieżki reintegracji — jak w projekcie graficznym. */
export function Stepper({ etap }: { etap: number }) {
  const G = "var(--color-green-bar)";
  const GR = "var(--color-line-strong)";
  return (
    <div className="flex items-start">
      {etapyNazwy.map((nazwa, si) => {
        const done = si < etap;
        const curr = si === etap;
        return (
          <div key={nazwa} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className="h-0.5 flex-1"
                style={{
                  background: si === 0 ? "transparent" : si <= etap ? G : GR,
                }}
              />
              <div
                className="z-[1] flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  background: done
                    ? "var(--color-primary)"
                    : curr
                      ? "var(--color-surface)"
                      : "var(--color-soft)",
                  border: `2px solid ${
                    si <= etap ? "var(--color-primary)" : "var(--color-line-strong)"
                  }`,
                  color: done
                    ? "oklch(1 0 0)"
                    : curr
                      ? "var(--color-primary-strong)"
                      : "var(--color-faint)",
                }}
              >
                {done ? (
                  <span className="material-symbols-rounded notranslate text-[19px]">
                    check
                  </span>
                ) : (
                  si + 1
                )}
              </div>
              <div
                className="h-0.5 flex-1"
                style={{
                  background: si === 3 ? "transparent" : si < etap ? G : GR,
                }}
              />
            </div>
            <div
              className="mt-2 text-center text-[11.5px]"
              style={{
                fontWeight: curr ? 700 : 500,
                color:
                  si <= etap ? "var(--color-ink-mid)" : "var(--color-faint)",
              }}
            >
              {nazwa}
            </div>
          </div>
        );
      })}
    </div>
  );
}
