"use client";

// Harmonogram zajęć w trzech widokach czasowych: dzień / tydzień / miesiąc.
// Zajęcia generowane z tygodniowego szablonu (mock) — planowanie realnych
// terminów i powiązanie z listami obecności to etap E2.

import { useMemo, useState } from "react";
import { harmonogramTygodnia } from "@/lib/mock-data";
import type { KolorZajec, ZajeciaTygodnia } from "@/lib/types";

type Widok = "dzien" | "tydzien" | "miesiac";

const KOLORY: Record<
  KolorZajec,
  { tlo: string; tekst: string; akcent: string }
> = {
  green: {
    tlo: "bg-green-soft",
    tekst: "text-primary-strong",
    akcent: "var(--color-green-bar)",
  },
  blue: {
    tlo: "bg-blue-soft",
    tekst: "text-blue-ink",
    akcent: "oklch(0.55 0.09 240)",
  },
  amber: {
    tlo: "bg-amber-soft",
    tekst: "text-amber-ink",
    akcent: "oklch(0.64 0.11 65)",
  },
};

const DNI_PELNE = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
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

/** indeks dnia tygodnia 0=Pn … 6=Nd */
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

/** Zajęcia danego dnia — z tygodniowego szablonu (Pn–Pt). */
function zajeciaDnia(d: Date): ZajeciaTygodnia[] {
  const wd = dzienTyg(d);
  return wd < 5 ? (harmonogramTygodnia[wd]?.zajecia ?? []) : [];
}

function KartaZajec({
  z,
  delay,
  pelna,
}: {
  z: ZajeciaTygodnia;
  delay: number;
  pelna?: boolean;
}) {
  const k = KOLORY[z.kolor];
  return (
    <div
      className="anim-card-in rounded-[13px] border border-line bg-surface px-[15px] py-[13px] shadow-[0_1px_2px_oklch(0.4_0.03_150/0.04),0_6px_18px_oklch(0.4_0.03_150/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_oklch(0.4_0.05_150/0.1)]"
      style={{
        borderLeft: `4px solid ${k.akcent}`,
        animationDelay: `${delay}s`,
      }}
    >
      <div
        className={
          pelna
            ? "flex flex-wrap items-center justify-between gap-2"
            : undefined
        }
      >
        <div>
          <div className="mb-1.5 font-serif text-sm font-semibold text-ink-mid">
            {z.godzina}
          </div>
          <div className="text-[14.5px] font-bold leading-[1.25] text-ink">
            {z.nazwa}
          </div>
        </div>
        <div className={pelna ? "text-right" : undefined}>
          <span
            className={`mt-[9px] inline-block rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${k.tlo} ${k.tekst}`}
          >
            {z.typ}
          </span>
          <div className="mt-2.5 flex items-center gap-[5px] text-xs text-muted">
            <span className="material-symbols-rounded notranslate text-base">group</span>
            {z.osob} uczestników
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Harmonogram() {
  const dzis = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
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

  // etykieta zakresu w pasku nawigacji
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

  // siatka miesiąca (pełne tygodnie Pn–Nd)
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

  const WIDOKI: [Widok, string][] = [
    ["dzien", "Dzień"],
    ["tydzien", "Tydzień"],
    ["miesiac", "Miesiąc"],
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
              calendar_month
            </span>
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {etykieta}
            </span>
          </span>
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

      {/* ===== Widok: DZIEŃ ===== */}
      {widok === "dzien" && (
        <div className="flex max-w-[760px] flex-col gap-3">
          {zajeciaDnia(kotwica).map((z, i) => (
            <KartaZajec key={`${z.godzina}-${z.nazwa}`} z={z} delay={i * 0.06} pelna />
          ))}
          {zajeciaDnia(kotwica).length === 0 && (
            <div className="card p-6 text-sm text-faint">
              {dzienTyg(kotwica) >= 5
                ? "Weekend — brak zaplanowanych zajęć."
                : "Brak zajęć w tym dniu."}
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
              const zajecia = zajeciaDnia(data);
              const dzisiaj = tenSamDzien(data, dzis);
              return (
                <div key={di} className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setKotwica(data);
                      setWidok("dzien");
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-[13px] border-none px-3.5 py-[11px] text-left ${
                      dzisiaj ? "bg-green-soft" : "bg-soft"
                    }`}
                    title="Pokaż dzień"
                  >
                    <span
                      className={`text-sm font-bold ${
                        dzisiaj ? "text-primary-strong" : "text-ink-mid"
                      }`}
                    >
                      {DNI_PELNE[di]}
                    </span>
                    <span
                      className={`text-xs ${
                        dzisiaj ? "text-primary-strong" : "text-faint"
                      }`}
                    >
                      {data.getDate()} {MIESIACE[data.getMonth()].slice(0, 3)}
                      {dzisiaj && " · dziś"}
                    </span>
                  </button>
                  {zajecia.map((z, zi) => (
                    <KartaZajec
                      key={`${z.godzina}-${z.nazwa}`}
                      z={z}
                      delay={di * 0.04 + zi * 0.06}
                    />
                  ))}
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
                const zajecia = wTymMiesiacu ? zajeciaDnia(data) : [];
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
                      wTymMiesiacu
                        ? "bg-surface hover:bg-hover-row"
                        : "bg-app"
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
                    {zajecia.slice(0, 2).map((z) => {
                      const k = KOLORY[z.kolor];
                      return (
                        <span
                          key={`${z.godzina}-${z.nazwa}`}
                          className={`w-full truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${k.tlo} ${k.tekst}`}
                        >
                          {z.godzina} {z.nazwa}
                        </span>
                      );
                    })}
                    {zajecia.length > 2 && (
                      <span className="text-[10.5px] font-semibold text-faint">
                        +{zajecia.length - 2} więcej
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-faint">
        Harmonogram testowy — zajęcia generowane z tygodniowego szablonu
        (Pn–Pt). Planowanie realnych terminów, grup i list obecności — etap E2.
      </p>
    </div>
  );
}
