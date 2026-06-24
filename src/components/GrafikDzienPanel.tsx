"use client";

// Panel edycji pracy jednej osoby w jednym dniu — etap E9.
// Pozwala dodać kilka bloków (godziny od-do, typ grupowe/indywidualne, zadanie),
// z których powstają wiersze karty czasu pracy.

import { useState } from "react";
import Portal from "@/components/Portal";
import type { OsobaKadry } from "@/lib/use-kadra";
import {
  liczbaGodzin,
  formatGodziny,
  type WpisGrafiku,
  type TypZajec,
} from "@/lib/db-grafik-kadry";

interface Blok {
  id?: string;
  godzinaOd: string;
  godzinaDo: string;
  typ: TypZajec;
  zadanie: string;
}

const pole =
  "w-full rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

const MIESIACE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const DNI_PELNE = [
  "Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota",
];

function etykietaDaty(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const data = new Date(y, m - 1, d);
  return `${DNI_PELNE[data.getDay()]}, ${d} ${MIESIACE[m - 1]} ${y}`;
}

export default function GrafikDzienPanel({
  osoba,
  dataISO,
  wpisy,
  onZapisz,
  onUsun,
  onClose,
}: {
  osoba: OsobaKadry;
  dataISO: string;
  wpisy: WpisGrafiku[]; // istniejące wpisy tej osoby w tym dniu
  onZapisz: (dane: Omit<WpisGrafiku, "id"> & { id?: string }) => void;
  onUsun: (id: string) => void;
  onClose: () => void;
}) {
  const [bloki, setBloki] = useState<Blok[]>(
    wpisy.length > 0
      ? wpisy.map((w) => ({
          id: w.id,
          godzinaOd: w.godzinaOd,
          godzinaDo: w.godzinaDo,
          typ: w.typ,
          zadanie: w.zadanie,
        }))
      : [{ godzinaOd: "08:00", godzinaDo: "16:00", typ: "grupowe", zadanie: "" }],
  );

  function zmien(i: number, zmiana: Partial<Blok>) {
    setBloki((stan) => stan.map((b, j) => (j === i ? { ...b, ...zmiana } : b)));
  }
  function dodajBlok() {
    setBloki((stan) => {
      // Nowy blok proponuje PRZECIWNY rodzaj — by łatwo dodać osobno
      // grupowe i indywidualne (są liczone oddzielnie).
      const ostatni = stan[stan.length - 1];
      const typ: TypZajec =
        ostatni?.typ === "grupowe" ? "indywidualne" : "grupowe";
      return [
        ...stan,
        { godzinaOd: "08:00", godzinaDo: "16:00", typ, zadanie: "" },
      ];
    });
  }
  function usunBlok(i: number) {
    setBloki((stan) => stan.filter((_, j) => j !== i));
  }

  function zapisz() {
    // wpisy usunięte w panelu → skasuj z bazy
    const pozostaleId = new Set(bloki.map((b) => b.id).filter(Boolean));
    for (const w of wpisy) {
      if (!pozostaleId.has(w.id)) onUsun(w.id);
    }
    // zapisz bloki z poprawnymi godzinami
    for (const b of bloki) {
      if (liczbaGodzin(b.godzinaOd, b.godzinaDo) <= 0) continue;
      onZapisz({
        id: b.id,
        kadraId: osoba.id,
        data: dataISO,
        godzinaOd: b.godzinaOd,
        godzinaDo: b.godzinaDo,
        typ: b.typ,
        zadanie: b.zadanie.trim(),
      });
    }
    onClose();
  }

  const sumaGodzin = bloki.reduce(
    (s, b) => s + liczbaGodzin(b.godzinaOd, b.godzinaDo),
    0,
  );
  const blednyBlok = bloki.some(
    (b) => liczbaGodzin(b.godzinaOd, b.godzinaDo) <= 0,
  );

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="card my-6 w-full max-w-[560px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-[16px]">
            <div className="min-w-0">
              <div className="font-serif text-lg font-semibold text-ink-strong">
                {osoba.imie} {osoba.nazwisko}
              </div>
              <div className="text-[12px] text-muted">
                {etykietaDaty(dataISO)}
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

          <div className="flex flex-col gap-3 px-6 py-5">
            {bloki.map((b, i) => {
              const h = liczbaGodzin(b.godzinaOd, b.godzinaDo);
              return (
                <div
                  key={i}
                  className="rounded-xl border border-line bg-soft/40 p-3"
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="th-label">Blok {i + 1}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-ink-mid">
                        {h > 0 ? `${formatGodziny(h)} godz.` : "—"}
                      </span>
                      {bloki.length > 1 && (
                        <button
                          onClick={() => usunBlok(i)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-ink hover:bg-red-soft/40"
                          title="Usuń blok"
                        >
                          <span className="material-symbols-rounded notranslate text-[16px]">
                            close
                          </span>
                        </button>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block th-label">Od godz.</label>
                      <input
                        type="time"
                        value={b.godzinaOd}
                        onChange={(e) => zmien(i, { godzinaOd: e.target.value })}
                        className={pole}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block th-label">Do godz.</label>
                      <input
                        type="time"
                        value={b.godzinaDo}
                        onChange={(e) => zmien(i, { godzinaDo: e.target.value })}
                        className={pole}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <label className="mb-1 block th-label">Rodzaj zajęć</label>
                    <div className="flex gap-1.5">
                      {(["grupowe", "indywidualne"] as TypZajec[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => zmien(i, { typ: t })}
                          className={`flex-1 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-all ${
                            b.typ === t
                              ? "bg-primary text-white"
                              : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
                          }`}
                        >
                          {t === "grupowe" ? "Grupowe" : "Indywidualne"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <label className="mb-1 block th-label">
                      Realizowane zadanie / forma wsparcia (opcjonalnie)
                    </label>
                    <input
                      value={b.zadanie}
                      onChange={(e) => zmien(i, { zadanie: e.target.value })}
                      placeholder="np. Warsztat kompetencji społecznych"
                      className={pole}
                    />
                  </div>
                </div>
              );
            })}

            <button
              onClick={dodajBlok}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2.5 text-[13px] font-semibold text-ink-mid hover:bg-soft"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                add
              </span>
              Dodaj osobny blok (grupowe / indywidualne)
            </button>

            <div className="flex items-center justify-between rounded-lg bg-green-soft px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-primary-strong">
                Razem w tym dniu
              </span>
              <span className="font-serif text-lg font-bold text-primary-strong">
                {formatGodziny(sumaGodzin)} godz.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-line-strong px-4 py-2 text-[13px] font-semibold text-ink-mid hover:bg-soft"
            >
              Anuluj
            </button>
            <button
              onClick={zapisz}
              disabled={blednyBlok}
              title={blednyBlok ? "Sprawdź godziny — „do” musi być po „od”." : undefined}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
