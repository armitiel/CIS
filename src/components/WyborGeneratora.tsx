"use client";

// Wspólny popup generowania: wybór UCZESTNIKÓW × wybór DOKUMENTÓW → jeden ZIP.
// Używany w module Dokumenty oraz na liście Uczestników (akcja dla zaznaczonych).

import { useMemo, useState } from "react";
import {
  sekcjeNazwy,
  type Sekcja,
  type SpecyfikacjaProjektu,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import { generujPakietyZbiorczo } from "@/lib/generator";
import type { Uczestnik } from "@/lib/types";

export default function WyborGeneratora({
  spec,
  uczestnicy,
  domyslniUczestnicy,
  onClose,
  onDone,
}: {
  spec: SpecyfikacjaProjektu;
  uczestnicy: Uczestnik[];
  /** identyfikatory uczestników wstępnie zaznaczonych (np. z listy) */
  domyslniUczestnicy?: string[];
  onClose: () => void;
  onDone: (komunikat: string) => void;
}) {
  const [wybraneDok, setWybraneDok] = useState<Set<string>>(new Set());
  const [wybraniUcz, setWybraniUcz] = useState<Set<string>>(
    new Set(
      domyslniUczestnicy ??
        uczestnicy.filter((u) => u.status === "aktywny").map((u) => u.id),
    ),
  );
  const [generuje, setGeneruje] = useState(false);

  const sekcje = useMemo(() => {
    const m = new Map<Sekcja, WymaganyDokument[]>();
    for (const d of spec.dokumenty) {
      if (!d.generowalny) continue;
      m.set(d.sekcja, [...(m.get(d.sekcja) ?? []), d]);
    }
    return m;
  }, [spec]);

  const przelacz = (
    set: Set<string>,
    id: string,
    setter: (s: Set<string>) => void,
  ) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  };

  async function generuj() {
    setGeneruje(true);
    try {
      const wybrani = uczestnicy.filter((u) => wybraniUcz.has(u.id));
      const pakiety = wybrani.map((u) => ({
        uczestnik: u,
        dokumenty: spec.dokumenty.filter(
          (d) =>
            wybraneDok.has(d.id) &&
            d.generowalny &&
            (d.dotyczy === "wszyscy" || d.dotyczy === u.kategoria),
        ),
      }));
      const n = await generujPakietyZbiorczo(pakiety, spec, "Pakiety_wybrane");
      onDone(
        n > 0
          ? `✓ Wygenerowano ZIP: ${wybraneDok.size} typów dokumentów dla ${n} z ${wybrani.length} zaznaczonych uczestników.`
          : "Żaden z wybranych dokumentów nie pasuje do zaznaczonych uczestników.",
      );
      onClose();
    } finally {
      setGeneruje(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
              Generowanie dokumentów
            </h3>
            <p className="m-0 mt-0.5 text-xs text-muted">
              Zaznacz uczestników i dokumenty — reguły projektu są respektowane
              (np. IPZS trafi tylko do bezrobotnych)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-ink"
            title="Zamknij"
          >
            <span className="material-symbols-rounded text-[22px]">close</span>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          {/* Uczestnicy */}
          <div className="flex flex-col overflow-hidden border-b border-line md:border-b-0 md:border-r">
            <div className="flex items-center justify-between bg-soft px-5 py-2.5">
              <span className="th-label">
                Uczestnicy ({wybraniUcz.size}/{uczestnicy.length})
              </span>
              <span className="flex gap-2 text-xs font-semibold">
                <button
                  onClick={() =>
                    setWybraniUcz(new Set(uczestnicy.map((u) => u.id)))
                  }
                  className="text-primary-strong hover:underline"
                >
                  wszyscy
                </button>
                <button
                  onClick={() =>
                    setWybraniUcz(
                      new Set(
                        uczestnicy
                          .filter((u) => u.status === "aktywny")
                          .map((u) => u.id),
                      ),
                    )
                  }
                  className="text-primary-strong hover:underline"
                >
                  aktywni
                </button>
                <button
                  onClick={() => setWybraniUcz(new Set())}
                  className="text-muted hover:underline"
                >
                  wyczyść
                </button>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {uczestnicy.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-hover-row"
                >
                  <input
                    type="checkbox"
                    checked={wybraniUcz.has(u.id)}
                    onChange={() =>
                      przelacz(wybraniUcz, u.id, setWybraniUcz)
                    }
                    className="h-4 w-4 accent-[oklch(0.52_0.09_152)]"
                  />
                  <span className="text-sm font-medium text-ink">
                    {u.nazwisko} {u.imie}
                  </span>
                  <span className="ml-auto text-xs text-faint">
                    {u.sciezka} · {u.status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dokumenty */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between bg-soft px-5 py-2.5">
              <span className="th-label">Dokumenty ({wybraneDok.size})</span>
              <span className="flex gap-2 text-xs font-semibold">
                <button
                  onClick={() =>
                    setWybraneDok(
                      new Set(
                        spec.dokumenty
                          .filter(
                            (d) => d.generowalny && d.rodzaj === "uczestnik",
                          )
                          .map((d) => d.id),
                      ),
                    )
                  }
                  className="text-primary-strong hover:underline"
                >
                  teczka
                </button>
                <button
                  onClick={() => setWybraneDok(new Set())}
                  className="text-muted hover:underline"
                >
                  wyczyść
                </button>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {[...sekcje.entries()].map(([sekcja, dokumenty]) => (
                <div key={sekcja} className="mb-3">
                  <div className="th-label mb-1 px-2">
                    {sekcjeNazwy[sekcja]}
                  </div>
                  {dokumenty.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-hover-row"
                    >
                      <input
                        type="checkbox"
                        checked={wybraneDok.has(d.id)}
                        onChange={() =>
                          przelacz(wybraneDok, d.id, setWybraneDok)
                        }
                        className="mt-0.5 h-4 w-4 accent-[oklch(0.52_0.09_152)]"
                      />
                      <span className="text-sm">
                        <span className="font-mono text-xs text-faint">
                          {d.symbol}
                        </span>{" "}
                        <span className="text-ink">{d.nazwa}</span>
                        {d.dotyczy !== "wszyscy" && (
                          <span className="ml-1 text-xs text-muted">
                            (
                            {d.dotyczy === "bezrobotny"
                              ? "tylko bezrobotni"
                              : "tylko bierni"}
                            )
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            Braki w teczkach uzupełnisz szybciej przyciskiem „Pakiety dla
            wszystkich” w module Dokumenty.
          </span>
          <button
            onClick={generuj}
            disabled={wybraneDok.size === 0 || wybraniUcz.size === 0 || generuje}
            className="btn-primary"
          >
            <span className="material-symbols-rounded text-[19px]">
              folder_zip
            </span>
            {generuje
              ? "Generuję…"
              : `Generuj ZIP (${wybraniUcz.size} × ${wybraneDok.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
