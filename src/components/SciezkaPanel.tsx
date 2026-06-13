"use client";

// Panel ścieżki reintegracji uczestnika (etap E3): zmiana etapu i postępu
// oraz dziennik wpisów kadry (diagnoza, cele, notatki, spotkania, dokumenty).

import { useState } from "react";
import Link from "next/link";
import Portal from "@/components/Portal";
import { Avatar, Stepper } from "@/components/ui";
import { useProjekt } from "@/components/ProjektProvider";
import { etapyNazwy } from "@/lib/mock-data";
import type { Uczestnik } from "@/lib/types";
import type { TypWpisu, WpisSciezki } from "@/lib/use-wpisy-sciezki";

const TYPY: { id: TypWpisu; label: string; ikona: string }[] = [
  { id: "diagnoza", label: "Diagnoza", ikona: "psychology" },
  { id: "cel", label: "Cel", ikona: "flag" },
  { id: "notatka", label: "Notatka", ikona: "edit_note" },
  { id: "spotkanie", label: "Spotkanie", ikona: "groups" },
  { id: "dokument", label: "Dokument", ikona: "description" },
];
const typInfo = (t: TypWpisu) => TYPY.find((x) => x.id === t) ?? TYPY[2];

function dzisIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SciezkaPanel({
  uczestnik,
  wpisy,
  onDodaj,
  onUsun,
  onClose,
}: {
  uczestnik: Uczestnik;
  wpisy: WpisSciezki[];
  onDodaj: (dane: Omit<WpisSciezki, "id">) => void;
  onUsun: (id: string) => void;
  onClose: () => void;
}) {
  const { aktualizujUczestnika } = useProjekt();
  const nazwa = `${uczestnik.imie} ${uczestnik.nazwisko}`;
  const etap = uczestnik.etapSciezki ?? 0;
  const postep = uczestnik.postepSciezki ?? 0;

  const [typ, setTyp] = useState<TypWpisu>("notatka");
  const [data, setData] = useState<string>(dzisIso());
  const [autor, setAutor] = useState<string>("");
  const [tresc, setTresc] = useState<string>("");

  function zapisz() {
    const t = tresc.trim();
    if (!t) return;
    onDodaj({ uczestnikId: uczestnik.id, data, typ, tresc: t, autor: autor.trim() });
    setTresc("");
  }

  const pole =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="card my-6 w-full max-w-[640px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* nagłówek */}
          <div className="flex items-center gap-[13px] border-b border-line px-6 py-[18px]">
            <Avatar nazwa={nazwa} size={42} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/uczestnicy/${uczestnik.id}`}
                className="block text-[15.5px] font-bold text-ink hover:text-primary-strong"
              >
                {nazwa}
              </Link>
              <div className="mt-px text-xs text-muted">
                {uczestnik.sciezka === "IPZS"
                  ? "IPZS · bezrobotny"
                  : "IPR · bierny zawodowo"}{" "}
                · grupa {uczestnik.grupa}
              </div>
            </div>
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

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {/* etap */}
            <div className="th-label mb-2">Etap ścieżki</div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {etapyNazwy.map((n, i) => {
                const akt = i === etap;
                return (
                  <button
                    key={n}
                    onClick={() =>
                      aktualizujUczestnika(uczestnik.id, {
                        etapSciezki: i as 0 | 1 | 2 | 3,
                      })
                    }
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      akt
                        ? "bg-primary text-white"
                        : "border border-line-strong text-ink-mid hover:bg-soft"
                    }`}
                  >
                    {i + 1}. {n}
                  </button>
                );
              })}
            </div>

            <div className="mb-5">
              <Stepper etap={etap} />
            </div>

            {/* postęp */}
            <div className="mb-5 flex items-center gap-3">
              <span className="th-label shrink-0">Postęp</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={postep}
                onChange={(e) =>
                  aktualizujUczestnika(uczestnik.id, {
                    postepSciezki: Number(e.target.value),
                  })
                }
                className="flex-1 accent-[oklch(0.52_0.12_152)]"
              />
              <span className="w-[44px] text-right text-[14px] font-bold text-primary-strong">
                {postep}%
              </span>
            </div>

            {/* dodawanie wpisu */}
            <div className="mb-4 rounded-[13px] border border-line bg-soft/40 p-4">
              <div className="th-label mb-2">Nowy wpis</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {TYPY.map((t) => {
                  const akt = typ === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTyp(t.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                        akt
                          ? "bg-primary text-white"
                          : "border border-line-strong text-ink-mid hover:bg-surface"
                      }`}
                    >
                      <span className="material-symbols-rounded notranslate text-[15px]">
                        {t.ikona}
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={tresc}
                onChange={(e) => setTresc(e.target.value)}
                rows={3}
                placeholder="Treść wpisu (diagnoza, ustalony cel, przebieg spotkania…)"
                className={`${pole} resize-none`}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={`${pole} w-[160px]`}
                />
                <input
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Prowadzący/a (opcjonalnie)"
                  className={`${pole} flex-1`}
                />
                <button
                  onClick={zapisz}
                  disabled={!tresc.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <span className="material-symbols-rounded notranslate text-[17px]">
                    add
                  </span>
                  Dodaj
                </button>
              </div>
            </div>

            {/* dziennik */}
            <div className="th-label mb-2">
              Dziennik ({wpisy.length})
            </div>
            {wpisy.length === 0 ? (
              <div className="rounded-[13px] bg-soft px-4 py-6 text-center text-[13px] text-faint">
                Brak wpisów. Dodaj diagnozę, cel albo notatkę ze spotkania.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {wpisy.map((w) => {
                  const info = typInfo(w.typ);
                  return (
                    <div
                      key={w.id}
                      className="group flex items-start gap-3 rounded-[13px] border border-line bg-surface px-[15px] py-[12px]"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft text-primary"
                        title={info.label}
                      >
                        <span className="material-symbols-rounded notranslate text-[18px]">
                          {info.ikona}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11.5px] text-muted">
                          <span className="font-semibold text-ink-mid">
                            {info.label}
                          </span>
                          <span>·</span>
                          <span>{w.data}</span>
                          {w.autor && (
                            <>
                              <span>·</span>
                              <span>{w.autor}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-[1.4] text-ink">
                          {w.tresc}
                        </div>
                      </div>
                      <button
                        onClick={() => onUsun(w.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint opacity-0 transition-opacity hover:bg-red-soft/50 hover:text-red-ink group-hover:opacity-100"
                        title="Usuń wpis"
                      >
                        <span className="material-symbols-rounded notranslate text-[16px]">
                          delete
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
