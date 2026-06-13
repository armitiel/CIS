"use client";

// Ścieżki reintegracji (etap E3): karty uczestników z etapem, postępem i
// podglądem ostatniego wpisu kadry. Kliknięcie otwiera panel zarządzania
// ścieżką (zmiana etapu/postępu, dziennik wpisów).

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import { najblizszeZadania } from "@/lib/mock-data";
import { Avatar, EtapBadge, Stepper } from "@/components/ui";
import SciezkaPanel from "@/components/SciezkaPanel";
import { useWpisySciezki } from "@/lib/use-wpisy-sciezki";

export default function Sciezki() {
  const { projekt, uczestnicy } = useProjekt();
  const { wpisy, dodaj, usun } = useWpisySciezki(projekt.id);
  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
  const [otwartyId, setOtwartyId] = useState<string | null>(null);

  const wpisyWg = useMemo(() => {
    const m: Record<string, typeof wpisy> = {};
    for (const w of wpisy) (m[w.uczestnikId] ??= []).push(w);
    return m;
  }, [wpisy]);

  const otwarty = aktywni.find((u) => u.id === otwartyId) ?? null;

  return (
    <div className="grid max-w-[1240px] grid-cols-1 gap-[18px] lg:grid-cols-2">
      {aktywni.map((u, i) => {
        const nazwa = `${u.imie} ${u.nazwisko}`;
        const lista = wpisyWg[u.id] ?? [];
        const ostatni = lista[0];
        return (
          <div
            key={u.id}
            className="card card-hover anim-card-in px-6 py-[22px]"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="mb-[22px] flex items-center gap-[13px]">
              <Avatar nazwa={nazwa} size={42} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/uczestnicy/${u.id}`}
                  className="block text-[15.5px] font-bold text-ink hover:text-primary-strong"
                >
                  {nazwa}
                </Link>
                <div className="mt-px text-xs text-muted">
                  {u.sciezka === "IPZS"
                    ? "IPZS · bezrobotny"
                    : "IPR · bierny zawodowo"}
                </div>
              </div>
              <EtapBadge etap={u.etapSciezki ?? 0} />
            </div>

            <Stepper etap={u.etapSciezki ?? 0} />

            <div className="mt-[22px] flex items-start gap-2.5 rounded-[13px] bg-soft px-[15px] py-[13px]">
              <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-primary">
                {ostatni ? "history_edu" : "flag"}
              </span>
              <div className="min-w-0">
                <div className="th-label mb-0.5 tracking-[0.04em]">
                  {ostatni ? "Ostatni wpis kadry" : "Najbliższe zadanie"}
                </div>
                <div className="line-clamp-2 text-[13.5px] leading-[1.35] text-ink-mid">
                  {ostatni
                    ? `${ostatni.data}: ${ostatni.tresc}`
                    : najblizszeZadania[u.etapSciezki ?? 0]}
                </div>
              </div>
            </div>

            <button
              onClick={() => setOtwartyId(u.id)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                route
              </span>
              Zarządzaj ścieżką
              {lista.length > 0 && (
                <span className="ml-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-bold text-primary-strong">
                  {lista.length}
                </span>
              )}
            </button>
          </div>
        );
      })}

      {aktywni.length === 0 && (
        <div className="card col-span-full p-6 text-sm text-faint">
          Brak aktywnych uczestników w projekcie „{projekt.skrot}” — ścieżki
          pojawią się po dodaniu lub zaimportowaniu bazy.
        </div>
      )}

      {otwarty && (
        <SciezkaPanel
          uczestnik={otwarty}
          wpisy={wpisyWg[otwarty.id] ?? []}
          onDodaj={dodaj}
          onUsun={usun}
          onClose={() => setOtwartyId(null)}
        />
      )}
    </div>
  );
}
