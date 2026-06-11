"use client";

import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import { najblizszeZadania } from "@/lib/mock-data";
import { Avatar, EtapBadge, Stepper } from "@/components/ui";

export default function Sciezki() {
  const { projekt, uczestnicy } = useProjekt();
  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");

  return (
    <div className="grid max-w-[1240px] grid-cols-1 gap-[18px] lg:grid-cols-2">
      {aktywni.map((u, i) => {
        const nazwa = `${u.imie} ${u.nazwisko}`;
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
              <span className="material-symbols-rounded shrink-0 text-[20px] text-primary">
                flag
              </span>
              <div>
                <div className="th-label mb-0.5 tracking-[0.04em]">
                  Najbliższe zadanie
                </div>
                <div className="text-[13.5px] leading-[1.35] text-ink-mid">
                  {najblizszeZadania[u.etapSciezki ?? 0]}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {aktywni.length === 0 && (
        <div className="card col-span-full p-6 text-sm text-faint">
          Brak aktywnych uczestników w projekcie „{projekt.skrot}” — ścieżki
          pojawią się po dodaniu lub zaimportowaniu bazy.
        </div>
      )}
    </div>
  );
}
