"use client";

// Import grafiku z pliku Excel "Plan_pracy_kadry_CIS.xlsx" (etap E9).
// Wczytuje zakładki miesięcy, dopasowuje osoby do kadry (po etykiecie
// "Nazwisko Imię"), pozwala utworzyć brakujące osoby i dopisuje wpisy do
// grafiku (pomijając duplikaty). Osoby na etacie nie są w zakładkach planu.

import { useRef, useState } from "react";
import Portal from "@/components/Portal";
import type { OsobaKadry } from "@/lib/use-kadra";
import type { WpisGrafiku } from "@/lib/db-grafik-kadry";
import { parsujGrafikZXlsx, type WierszImportu } from "@/lib/import-grafik-xlsx";

function nowyId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function etykietaOsoby(o: OsobaKadry): string {
  return `${o.nazwisko} ${o.imie}`.trim();
}

function rozbijEtykiete(label: string): { imie: string; nazwisko: string } {
  const cz = label.trim().split(/\s+/);
  if (cz.length <= 1) return { nazwisko: label.trim(), imie: "" };
  return { nazwisko: cz[0], imie: cz.slice(1).join(" ") };
}

export default function ImportGrafikuPanel({
  kadra,
  grafik,
  onZapiszOsoba,
  onZapiszWpis,
  onClose,
}: {
  kadra: OsobaKadry[];
  grafik: WpisGrafiku[];
  onZapiszOsoba: (dane: Omit<OsobaKadry, "id"> & { id?: string }) => void;
  onZapiszWpis: (dane: Omit<WpisGrafiku, "id"> & { id?: string }) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [wiersze, setWiersze] = useState<WierszImportu[] | null>(null);
  const [miesiace, setMiesiace] = useState<string[]>([]);
  const [tworzBrakujace, setTworzBrakujace] = useState(true);
  const [blad, setBlad] = useState("");
  const [wynik, setWynik] = useState<{ dodane: number; pominiete: number; osoby: number } | null>(null);

  // mapa etykieta(lower) -> osoba
  const mapaKadry = new Map(kadra.map((o) => [etykietaOsoby(o).toLowerCase(), o]));

  const osobyWImporcie = wiersze
    ? Array.from(new Set(wiersze.map((w) => w.osoba)))
    : [];
  const dopasowane = osobyWImporcie.filter((o) => mapaKadry.has(o.toLowerCase()));
  const nieznane = osobyWImporcie.filter((o) => !mapaKadry.has(o.toLowerCase()));

  async function wczytajPlik(file: File) {
    setBlad("");
    setWynik(null);
    try {
      const buf = await file.arrayBuffer();
      const { wiersze: w, miesiace: m } = parsujGrafikZXlsx(buf);
      if (w.length === 0) {
        setBlad(
          "Nie znaleziono wpisów w zakładkach miesięcy (Czerwiec…Grudzień). Upewnij się, że to plik planu pracy kadry.",
        );
        setWiersze(null);
        return;
      }
      setWiersze(w);
      setMiesiace(m);
    } catch {
      setBlad("Nie udało się odczytać pliku. Czy to plik .xlsx?");
      setWiersze(null);
    }
  }

  function importuj() {
    if (!wiersze) return;
    // 1) utwórz brakujące osoby (z własnym id, aby przypiąć wpisy)
    const mapa = new Map(mapaKadry);
    let utworzone = 0;
    if (tworzBrakujace) {
      for (const label of nieznane) {
        const { imie, nazwisko } = rozbijEtykiete(label);
        const id = nowyId();
        const wzor = wiersze.find((w) => w.osoba === label);
        onZapiszOsoba({
          id,
          imie,
          nazwisko,
          stanowisko: "",
          wymiar: "",
          godzinaOd: wzor?.od || "08:00",
          godzinaDo: wzor?.do || "16:00",
          typDomyslny: wzor?.typ ?? "grupowe",
          aktywny: true,
        });
        mapa.set(label.toLowerCase(), {
          id,
          imie,
          nazwisko,
          stanowisko: "",
          wymiar: "",
          godzinaOd: wzor?.od || "08:00",
          godzinaDo: wzor?.do || "16:00",
          typDomyslny: wzor?.typ ?? "grupowe",
          aktywny: true,
        });
        utworzone++;
      }
    }
    // 2) zbiór istniejących wpisów (dedup)
    const klucz = (kadraId: string, w: { dataISO: string; od: string; do: string; typ: string }) =>
      `${kadraId}|${w.dataISO}|${w.od}|${w.do}|${w.typ}`;
    const istnieje = new Set(
      grafik.map((g) => `${g.kadraId}|${g.data}|${g.godzinaOd}|${g.godzinaDo}|${g.typ}`),
    );
    let dodane = 0;
    let pominiete = 0;
    for (const w of wiersze) {
      const o = mapa.get(w.osoba.toLowerCase());
      if (!o) {
        pominiete++;
        continue;
      }
      const k = klucz(o.id, w);
      if (istnieje.has(k)) {
        pominiete++;
        continue;
      }
      istnieje.add(k);
      onZapiszWpis({
        kadraId: o.id,
        data: w.dataISO,
        godzinaOd: w.od,
        godzinaDo: w.do,
        typ: w.typ,
        zadanie: w.zadanie,
      });
      dodane++;
    }
    setWynik({ dodane, pominiete, osoby: utworzone });
  }

  const pole =
    "rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] text-ink";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="card mt-[6vh] w-full max-w-[560px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-ink-strong">
              Import grafiku z Excela
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-soft"
            >
              <span className="material-symbols-rounded notranslate">close</span>
            </button>
          </div>

          {!wynik && (
            <>
              <p className="mb-3 text-[13px] text-muted">
                Wczytaj plik <b>Plan_pracy_kadry_CIS.xlsx</b>. Pobierzemy wpisy z
                zakładek miesięcy (Czerwiec…Grudzień) i dopiszemy je do grafiku.
                Osoby na etacie (karty liczone regułą) nie są w tych zakładkach.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) wczytajPlik(f);
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-soft px-4 py-6 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-hover-row"
              >
                <span className="material-symbols-rounded notranslate text-[20px]">
                  upload_file
                </span>
                Wybierz plik .xlsx
              </button>

              {blad && (
                <div className="mt-3 rounded-lg bg-[var(--color-amber-soft)] px-3 py-2 text-[12.5px] text-ink">
                  {blad}
                </div>
              )}

              {wiersze && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-xl border border-line-soft bg-surface px-3.5 py-3 text-[13px]">
                    <div className="mb-1 font-semibold text-ink">
                      Znaleziono {wiersze.length} wpisów
                    </div>
                    <div className="text-muted">
                      Miesiące: {miesiace.join(", ")}
                    </div>
                    <div className="mt-1.5 text-muted">
                      Dopasowane osoby: <b className="text-ink">{dopasowane.length}</b>
                      {nieznane.length > 0 && (
                        <>
                          {" · "}nowe: <b className="text-ink">{nieznane.length}</b>
                        </>
                      )}
                    </div>
                    {nieznane.length > 0 && (
                      <div className="mt-1.5 text-[12px] text-faint">
                        Spoza kadry: {nieznane.join(", ")}
                      </div>
                    )}
                  </div>

                  {nieznane.length > 0 && (
                    <label className="flex items-center gap-2 text-[13px] text-ink">
                      <input
                        type="checkbox"
                        checked={tworzBrakujace}
                        onChange={(e) => setTworzBrakujace(e.target.checked)}
                      />
                      Utwórz brakujące osoby w kadrze ({nieznane.length})
                    </label>
                  )}

                  <button
                    onClick={importuj}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <span className="material-symbols-rounded notranslate text-[18px]">
                      done
                    </span>
                    Importuj do grafiku
                  </button>
                </div>
              )}
            </>
          )}

          {wynik && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-line-soft bg-surface px-4 py-4 text-[13.5px]">
                <div className="mb-2 flex items-center gap-2 font-semibold text-primary-strong">
                  <span className="material-symbols-rounded notranslate">check_circle</span>
                  Import zakończony
                </div>
                <div className="text-ink">
                  Dodano wpisów: <b>{wynik.dodane}</b>
                </div>
                {wynik.osoby > 0 && (
                  <div className="text-ink">Utworzono osób: <b>{wynik.osoby}</b></div>
                )}
                <div className="text-muted">
                  Pominięto (duplikaty / bez osoby): {wynik.pominiete}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Gotowe
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
