import { harmonogramTygodnia, tydzienEtykieta } from "@/lib/mock-data";
import type { KolorZajec } from "@/lib/types";

const KOLORY: Record<
  KolorZajec,
  { tlo: string; tekst: string; akcent: string }
> = {
  green: {
    tlo: "bg-green-soft",
    tekst: "text-primary-strong",
    akcent: "oklch(0.55 0.1 150)",
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

export default function Harmonogram() {
  return (
    <div className="max-w-[1280px]">
      <div className="mb-[18px] flex items-center gap-[11px]">
        <span className="material-symbols-rounded text-[22px] text-primary">
          calendar_month
        </span>
        <span className="font-serif text-lg font-semibold text-ink-strong">
          {tydzienEtykieta}
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-5 gap-3.5">
          {harmonogramTygodnia.map((d, di) => (
            <div key={d.dzien} className="flex flex-col gap-3">
              <div
                className={`flex items-center justify-between rounded-[13px] px-3.5 py-[11px] ${
                  d.dzisiaj ? "bg-green-soft" : "bg-[oklch(0.97_0.008_150)]"
                }`}
              >
                <span
                  className={`text-sm font-bold ${
                    d.dzisiaj
                      ? "text-[oklch(0.4_0.09_152)]"
                      : "text-[oklch(0.34_0.02_150)]"
                  }`}
                >
                  {d.dzien}
                </span>
                <span
                  className={`text-xs ${
                    d.dzisiaj ? "text-[oklch(0.5_0.07_152)]" : "text-faint"
                  }`}
                >
                  {d.data}
                  {d.dzisiaj && " · dziś"}
                </span>
              </div>

              {d.zajecia.map((z, zi) => {
                const k = KOLORY[z.kolor];
                return (
                  <div
                    key={`${z.godzina}-${z.nazwa}`}
                    className="anim-card-in rounded-[13px] border border-line bg-surface px-[15px] py-[13px] shadow-[0_1px_2px_oklch(0.4_0.03_150/0.04),0_6px_18px_oklch(0.4_0.03_150/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_oklch(0.4_0.05_150/0.1)]"
                    style={{
                      borderLeft: `4px solid ${k.akcent}`,
                      animationDelay: `${di * 0.04 + zi * 0.06}s`,
                    }}
                  >
                    <div className="mb-1.5 font-serif text-sm font-semibold text-ink-mid">
                      {z.godzina}
                    </div>
                    <div className="text-[14.5px] font-bold leading-[1.25] text-ink">
                      {z.nazwa}
                    </div>
                    <span
                      className={`mt-[9px] inline-block rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${k.tlo} ${k.tekst}`}
                    >
                      {z.typ}
                    </span>
                    <div className="mt-2.5 flex items-center gap-[5px] text-xs text-muted">
                      <span className="material-symbols-rounded text-base">
                        group
                      </span>
                      {z.osob} uczestników
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-faint">
        Harmonogram testowy (projekt CIS). Planowanie zajęć, dzienniki i listy
        obecności z harmonogramu — etap E2.
      </p>
    </div>
  );
}
