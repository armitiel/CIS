"use client";

// Panel dodawania/edycji zajęć w harmonogramie (etap E4).

import { useState } from "react";
import Portal from "@/components/Portal";
import type { KolorZajec } from "@/lib/types";
import type { Zajecie } from "@/lib/use-zajecia";

const KOLORY: { id: KolorZajec; label: string; klasa: string }[] = [
  { id: "green", label: "Zielony", klasa: "bg-green-soft text-primary-strong" },
  { id: "blue", label: "Niebieski", klasa: "bg-blue-soft text-blue-ink" },
  { id: "amber", label: "Bursztyn", klasa: "bg-amber-soft text-amber-ink" },
];

export default function ZajeciaPanel({
  zajecie,
  domyslnaData,
  onZapisz,
  onUsun,
  onClose,
}: {
  zajecie: Zajecie | null;
  domyslnaData: string;
  onZapisz: (dane: Omit<Zajecie, "id"> & { id?: string }) => void;
  onUsun: (id: string) => void;
  onClose: () => void;
}) {
  const [nazwa, setNazwa] = useState(zajecie?.nazwa ?? "");
  const [typ, setTyp] = useState(zajecie?.typ ?? "");
  const [prowadzacy, setProwadzacy] = useState(zajecie?.prowadzacy ?? "");
  const [grupa, setGrupa] = useState(zajecie?.grupa ?? "");
  const [data, setData] = useState(zajecie?.data ?? domyslnaData);
  const [godzina, setGodzina] = useState(zajecie?.godzina ?? "09:00");
  const [godzinaDo, setGodzinaDo] = useState(zajecie?.godzinaDo ?? "12:00");
  const [kolor, setKolor] = useState<KolorZajec>(zajecie?.kolor ?? "green");
  const [osob, setOsob] = useState<number>(zajecie?.osob ?? 0);

  function zapisz() {
    if (!nazwa.trim()) return;
    onZapisz({
      id: zajecie?.id,
      nazwa: nazwa.trim(),
      typ: typ.trim(),
      prowadzacy: prowadzacy.trim(),
      grupa: grupa.trim(),
      data,
      godzina,
      godzinaDo,
      kolor,
      osob: Number(osob) || 0,
    });
    onClose();
  }

  const pole =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";
  const etyk = "mb-1 block th-label";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="card my-6 w-full max-w-[540px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-[16px]">
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {zajecie ? "Edytuj zajęcia" : "Nowe zajęcia"}
            </span>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-soft hover:text-ink"
              title="Zamknij"
            >
              <span className="material-symbols-rounded notranslate text-[20px]">
                close
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-3.5 px-6 py-5">
            <div>
              <label className={etyk}>Nazwa zajęć</label>
              <input
                value={nazwa}
                onChange={(e) => setNazwa(e.target.value)}
                placeholder="np. Warsztat kompetencji społecznych"
                className={pole}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etyk}>Typ</label>
                <input
                  value={typ}
                  onChange={(e) => setTyp(e.target.value)}
                  placeholder="np. Grupowe"
                  className={pole}
                />
              </div>
              <div>
                <label className={etyk}>Grupa</label>
                <input
                  value={grupa}
                  onChange={(e) => setGrupa(e.target.value)}
                  placeholder="np. A"
                  className={pole}
                />
              </div>
            </div>

            <div>
              <label className={etyk}>Prowadzący/a</label>
              <input
                value={prowadzacy}
                onChange={(e) => setProwadzacy(e.target.value)}
                placeholder="imię i nazwisko kadry"
                className={pole}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={etyk}>Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={pole}
                />
              </div>
              <div>
                <label className={etyk}>Od</label>
                <input
                  type="time"
                  value={godzina}
                  onChange={(e) => setGodzina(e.target.value)}
                  className={pole}
                />
              </div>
              <div>
                <label className={etyk}>Do</label>
                <input
                  type="time"
                  value={godzinaDo}
                  onChange={(e) => setGodzinaDo(e.target.value)}
                  className={pole}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etyk}>Liczba uczestników</label>
                <input
                  type="number"
                  min={0}
                  value={osob || ""}
                  onChange={(e) => setOsob(Number(e.target.value) || 0)}
                  className={pole}
                />
              </div>
              <div>
                <label className={etyk}>Kolor</label>
                <div className="flex gap-1.5">
                  {KOLORY.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setKolor(k.id)}
                      className={`flex-1 rounded-lg px-2 py-2 text-[11.5px] font-semibold transition-all ${k.klasa} ${
                        kolor === k.id
                          ? "ring-2 ring-primary ring-offset-1"
                          : "opacity-70"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
            {zajecie ? (
              <button
                onClick={() => {
                  if (window.confirm("Usunąć te zajęcia z harmonogramu?")) {
                    onUsun(zajecie.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-red-ink hover:bg-red-soft/40"
              >
                <span className="material-symbols-rounded notranslate text-[17px]">
                  delete
                </span>
                Usuń
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-line-strong px-4 py-2 text-[13px] font-semibold text-ink-mid hover:bg-soft"
              >
                Anuluj
              </button>
              <button
                onClick={zapisz}
                disabled={!nazwa.trim()}
                className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
