"use client";

// Panel zarządzania listą kadry (osób zatrudnionych) — etap E9.
// Dodawanie, edycja i usuwanie osób, które potem klika się w grafiku.

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";
import type { OsobaKadry } from "@/lib/use-kadra";
import { liczbaGodzin, type TypZajec } from "@/lib/db-grafik-kadry";

const pole =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";
const etyk = "mb-1 block th-label";

/** Godzina zakończenia = początek + liczba godzin (np. 08:00 + 6 = 14:00). */
function godzinaZakonczenia(start: string, godzin: number): string {
  const r = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  if (!r) return start;
  let minuty = Number(r[1]) * 60 + Number(r[2]) + Math.round(godzin * 60);
  if (minuty > 23 * 60 + 59) minuty = 23 * 60 + 59;
  if (minuty < 0) minuty = 0;
  const h = Math.floor(minuty / 60);
  const m = minuty % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function KadraPanel({
  kadra,
  onZapisz,
  onUsun,
  onClose,
  edytujId,
}: {
  kadra: OsobaKadry[];
  onZapisz: (dane: Omit<OsobaKadry, "id"> & { id?: string }) => void;
  onUsun: (id: string) => void;
  onClose: () => void;
  /** id osoby do edycji od razu po otwarciu (np. ołówek z widoku miesiąca) */
  edytujId?: string | null;
}) {
  const [edycja, setEdycja] = useState<OsobaKadry | null>(null);
  const [imie, setImie] = useState("");
  const [nazwisko, setNazwisko] = useState("");
  const [stanowisko, setStanowisko] = useState("");
  const [wymiar, setWymiar] = useState("");
  const [godzinaOd, setGodzinaOd] = useState("08:00");
  const [godzinDziennie, setGodzinDziennie] = useState<number>(8);
  const [typDomyslny, setTypDomyslny] = useState<TypZajec>("grupowe");

  const godzinaDo = godzinaZakonczenia(godzinaOd, godzinDziennie);

  // Otwarcie z ołówka (np. z widoku miesiąca) → od razu edytuj wskazaną osobę.
  useEffect(() => {
    if (!edytujId) return;
    const o = kadra.find((x) => x.id === edytujId);
    if (o) rozpocznijEdycje(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edytujId]);

  function wyczysc() {
    setEdycja(null);
    setImie("");
    setNazwisko("");
    setStanowisko("");
    setWymiar("");
    setGodzinaOd("08:00");
    setGodzinDziennie(8);
    setTypDomyslny("grupowe");
  }

  function rozpocznijEdycje(o: OsobaKadry) {
    setEdycja(o);
    setImie(o.imie);
    setNazwisko(o.nazwisko);
    setStanowisko(o.stanowisko);
    setWymiar(o.wymiar);
    setGodzinaOd(o.godzinaOd || "08:00");
    setGodzinDziennie(liczbaGodzin(o.godzinaOd, o.godzinaDo) || 8);
    setTypDomyslny(o.typDomyslny ?? "grupowe");
  }

  function zapisz() {
    if (!imie.trim() && !nazwisko.trim()) return;
    onZapisz({
      id: edycja?.id,
      imie: imie.trim(),
      nazwisko: nazwisko.trim(),
      stanowisko: stanowisko.trim(),
      wymiar: wymiar.trim(),
      godzinaOd,
      godzinaDo,
      typDomyslny,
      aktywny: edycja?.aktywny ?? true,
    });
    wyczysc();
  }

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
            <span className="font-serif text-lg font-semibold text-ink-strong">
              Kadra projektu
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

          {/* Lista osób */}
          <div className="max-h-[320px] overflow-y-auto">
            {kadra.length === 0 && (
              <div className="px-6 py-6 text-center text-sm text-faint">
                Brak osób. Dodaj pierwszą osobę poniżej.
              </div>
            )}
            {kadra.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 border-b border-line-soft px-6 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {o.imie} {o.nazwisko}
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {o.stanowisko || "—"}
                    {o.godzinaOd && o.godzinaDo
                      ? ` · ${liczbaGodzin(o.godzinaOd, o.godzinaDo).toLocaleString("pl-PL")} h/dzień (${o.godzinaOd}–${o.godzinaDo})`
                      : ""}
                    {o.wymiar ? ` · ${o.wymiar}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => rozpocznijEdycje(o)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mid hover:bg-soft"
                    title="Edytuj"
                  >
                    <span className="material-symbols-rounded notranslate text-[18px]">
                      edit
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Usunąć ${o.imie} ${o.nazwisko} z kadry? Skasuje to także jej wpisy w grafiku.`,
                        )
                      ) {
                        onUsun(o.id);
                        if (edycja?.id === o.id) wyczysc();
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-ink hover:bg-red-soft/40"
                    title="Usuń"
                  >
                    <span className="material-symbols-rounded notranslate text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Formularz dodania/edycji */}
          <div className="flex flex-col gap-3 border-t border-line bg-soft/40 px-6 py-5">
            <span className="th-label">
              {edycja ? "Edytuj osobę" : "Dodaj osobę"}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etyk}>Imię</label>
                <input
                  value={imie}
                  onChange={(e) => setImie(e.target.value)}
                  className={pole}
                  autoFocus
                />
              </div>
              <div>
                <label className={etyk}>Nazwisko</label>
                <input
                  value={nazwisko}
                  onChange={(e) => setNazwisko(e.target.value)}
                  className={pole}
                />
              </div>
            </div>
            <div>
              <label className={etyk}>Stanowisko (pozycja budżetu)</label>
              <input
                value={stanowisko}
                onChange={(e) => setStanowisko(e.target.value)}
                placeholder="np. Specjalista ds. reintegracji zawodowej"
                className={pole}
              />
            </div>
            <div>
              <label className={etyk}>Wymiar etatu / limit godzin</label>
              <input
                value={wymiar}
                onChange={(e) => setWymiar(e.target.value)}
                placeholder="np. 1/2 etatu · 80 godz./mies."
                className={pole}
              />
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <span className="th-label">
                Domyślny czas pracy (do szybkiego klikania)
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className={etyk}>Liczba godzin dziennie</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={godzinDziennie || ""}
                    onChange={(e) =>
                      setGodzinDziennie(Number(e.target.value) || 0)
                    }
                    placeholder="np. 6"
                    className={pole}
                  />
                </div>
                <div>
                  <label className={etyk}>Rozpoczyna o</label>
                  <input
                    type="time"
                    value={godzinaOd}
                    onChange={(e) => setGodzinaOd(e.target.value)}
                    className={pole}
                  />
                </div>
              </div>
              <p className="mt-2 text-[12px] text-muted">
                {godzinDziennie > 0
                  ? `Kliknięcie w grafiku wpisze ${godzinDziennie.toLocaleString("pl-PL")} godz.: ${godzinaOd}–${godzinaDo}.`
                  : "Podaj liczbę godzin, aby włączyć szybkie klikanie."}
              </p>
              <div className="mt-2.5">
                <label className={etyk}>Domyślny rodzaj zajęć</label>
                <div className="flex gap-1.5">
                  {(["grupowe", "indywidualne"] as TypZajec[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypDomyslny(t)}
                      className={`flex-1 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-all ${
                        typDomyslny === t
                          ? "bg-primary text-white"
                          : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
                      }`}
                    >
                      {t === "grupowe" ? "Grupowe" : "Indywidualne"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {edycja && (
                <button
                  onClick={wyczysc}
                  className="rounded-lg border border-line-strong px-4 py-2 text-[13px] font-semibold text-ink-mid hover:bg-soft"
                >
                  Anuluj
                </button>
              )}
              <button
                onClick={zapisz}
                disabled={!imie.trim() && !nazwisko.trim()}
                className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {edycja ? "Zapisz zmiany" : "Dodaj osobę"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
