"use client";

import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import {
  dzisiejszeZajecia,
  etapyNazwy,
  limity,
  ostatniaAktywnosc,
} from "@/lib/mock-data";
import { brakiWTeczce } from "@/lib/projekt-spec";
import PulpitStats from "@/components/PulpitStats";
import { Avatar, Pasek } from "@/components/ui";

const ODCIEN: Record<string, { ikona: string; tlo: string }> = {
  green: { ikona: "text-primary-strong", tlo: "bg-green-soft" },
  amber: { ikona: "text-amber-ink", tlo: "bg-amber-soft" },
  blue: { ikona: "text-blue-ink", tlo: "bg-blue-soft" },
  teal: { ikona: "text-teal-ink", tlo: "bg-teal-soft" },
};

const KROPKI = [
  "oklch(0.55 0.1 150)",
  "oklch(0.55 0.09 240)",
  "oklch(0.62 0.1 60)",
];

export default function Pulpit() {
  const { projekt, uczestnicy } = useProjekt();
  const czyCIS = projekt.id === "cis-2026";

  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
  const sredniaFrekwencja = Math.round(
    aktywni.reduce((s, u) => s + u.frekwencja, 0) / (aktywni.length || 1),
  );
  const niekompletne = uczestnicy.filter(
    (u) => brakiWTeczce(u, projekt.spec).length > 0,
  ).length;
  const sredniPostep = Math.round(
    aktywni.reduce((s, u) => s + (u.postepSciezki ?? 0), 0) /
      (aktywni.length || 1),
  );
  const bezrobotni = aktywni.filter((u) => u.kategoria === "bezrobotny").length;
  const bierni = aktywni.filter((u) => u.kategoria === "bierny").length;
  const limityTekst = czyCIS
    ? `bezrobotni ${bezrobotni}/${limity.bezrobotni.limit} · bierni ${bierni}/${limity.bierni.limit}`
    : `IPZS ${bezrobotni} · IPR ${bierni}`;

  const zajecia = czyCIS ? dzisiejszeZajecia : [];
  const aktywnosc = czyCIS ? ostatniaAktywnosc : [];

  const postepy = [...aktywni]
    .sort((a, b) => (b.postepSciezki ?? 0) - (a.postepSciezki ?? 0))
    .slice(0, 5);

  return (
    <div className="flex max-w-[1240px] flex-col gap-5">
      <PulpitStats
        aktywni={aktywni.length}
        sciezki={aktywni.length}
        frekwencja={sredniaFrekwencja}
        braki={niekompletne}
        sredniPostep={sredniPostep}
        limityTekst={limityTekst}
      />

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        {/* Postęp ścieżek reintegracji */}
        <div
          className="card anim-card-in px-6 py-[22px]"
          style={{ animationDelay: "0.28s" }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
              Postęp ścieżek reintegracji
            </h2>
            <Link
              href="/sciezki"
              className="flex items-center gap-[3px] text-[13px] font-semibold text-primary-strong"
            >
              Wszyscy
              <span className="material-symbols-rounded notranslate text-lg">
                chevron_right
              </span>
            </Link>
          </div>
          {postepy.map((u, i) => {
            const nazwa = `${u.imie} ${u.nazwisko}`;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3.5 border-t border-line-soft py-[13px]"
              >
                <Avatar nazwa={nazwa} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <Link
                      href={`/uczestnicy/${u.id}`}
                      className="text-[14.5px] font-semibold text-ink hover:text-primary-strong"
                    >
                      {nazwa}
                    </Link>
                    <span className="font-serif text-[15px] font-semibold text-primary-strong">
                      {u.postepSciezki ?? 0}%
                    </span>
                  </div>
                  <div className="mt-[7px]">
                    <Pasek pct={u.postepSciezki ?? 0} delay={i * 0.07} />
                  </div>
                  <div className="mt-[5px] text-xs text-muted">
                    Etap: {etapyNazwy[u.etapSciezki ?? 0]}
                  </div>
                </div>
              </div>
            );
          })}
          {postepy.length === 0 && (
            <p className="border-t border-line-soft py-5 text-sm text-faint">
              Brak aktywnych uczestników w projekcie „{projekt.skrot}”.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-[18px]">
          {/* Dzisiaj w harmonogramie */}
          <div
            className="card anim-card-in px-6 py-[22px]"
            style={{ animationDelay: "0.35s" }}
          >
            <h2 className="m-0 mb-3.5 font-serif text-[19px] font-semibold text-ink-strong">
              Dzisiaj w harmonogramie
            </h2>
            {zajecia.map((z, i) => (
              <div key={z.id} className="flex items-center gap-[13px] py-2.5">
                <div className="w-[42px] shrink-0 font-serif text-sm font-semibold text-ink-mid">
                  {z.godzina.split("–")[0]}
                </div>
                <div
                  className="h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{
                    background: KROPKI[i % KROPKI.length],
                    boxShadow: "0 0 0 4px oklch(0.55 0.06 150 / 0.1)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {z.nazwa}
                  </div>
                  <div className="text-xs text-muted">
                    {z.prowadzacy} · grupa {z.grupa} · {z.sala}
                  </div>
                </div>
              </div>
            ))}
            {zajecia.length === 0 && (
              <p className="py-2 text-sm text-faint">
                Brak zaplanowanych zajęć — harmonogram projektu „
                {projekt.skrot}” pojawi się po uzupełnieniu modułu.
              </p>
            )}
          </div>

          {/* Ostatnia aktywność */}
          <div
            className="card anim-card-in px-6 py-[22px]"
            style={{ animationDelay: "0.42s" }}
          >
            <h2 className="m-0 mb-3 font-serif text-[19px] font-semibold text-ink-strong">
              Ostatnia aktywność
            </h2>
            {aktywnosc.map((a, i) => {
              const o = ODCIEN[a.odcien];
              return (
                <div key={i} className="flex gap-3 py-[9px]">
                  <div
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${o.tlo}`}
                  >
                    <span
                      className={`material-symbols-rounded notranslate text-[19px] ${o.ikona}`}
                    >
                      {a.ikona}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] leading-[1.35] text-ink-mid">
                      <span className="font-bold text-ink">{a.kto}</span>
                      {a.co}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-faint">
                      {a.kiedy}
                    </div>
                  </div>
                </div>
              );
            })}
            {aktywnosc.length === 0 && (
              <p className="py-2 text-sm text-faint">
                Brak wpisów dla projektu „{projekt.skrot}”.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
