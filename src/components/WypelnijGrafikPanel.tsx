"use client";

// Panel zbiorczego wypełniania grafiku z powtarzalnością (etap E9).
// Ustawiasz godziny raz i nakładasz je na wybrane dni tygodnia w zakresie dat —
// dla jednej osoby lub całej kadry. Pomija dni już wypełnione (opcjonalnie).

import { useMemo, useState } from "react";
import Portal from "@/components/Portal";
import type { OsobaKadry } from "@/lib/use-kadra";
import {
  liczbaGodzin,
  type WpisGrafiku,
  type TypZajec,
} from "@/lib/db-grafik-kadry";

const pole =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";
const etyk = "mb-1 block th-label";

// dow zgodne z Date.getDay(): 0 = niedziela … 6 = sobota
const DNI_TYG: { dow: number; label: string }[] = [
  { dow: 1, label: "Pn" },
  { dow: 2, label: "Wt" },
  { dow: 3, label: "Śr" },
  { dow: 4, label: "Cz" },
  { dow: 5, label: "Pt" },
  { dow: 6, label: "So" },
  { dow: 0, label: "Nd" },
];

const p2 = (n: number) => String(n).padStart(2, "0");
function isoZDaty(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function generujDaty(odISO: string, doISO: string, dni: number[]): string[] {
  if (!odISO || !doISO || dni.length === 0) return [];
  const start = parseISO(odISO);
  const koniec = parseISO(doISO);
  if (koniec < start) return [];
  const out: string[] = [];
  const kursor = new Date(start);
  let guard = 0;
  while (kursor <= koniec && guard++ < 1100) {
    if (dni.includes(kursor.getDay())) out.push(isoZDaty(kursor));
    kursor.setDate(kursor.getDate() + 1);
  }
  return out;
}

function odmianaDni(n: number): string {
  if (n === 1) return "dzień";
  const d = n % 10;
  const s = n % 100;
  return d >= 2 && d <= 4 && !(s >= 12 && s <= 14) ? "dni" : "dni";
}

export default function WypelnijGrafikPanel({
  kadra,
  domyslnaOd,
  domyslnaDo,
  istnieje,
  onZapisz,
  onClose,
}: {
  kadra: OsobaKadry[];
  domyslnaOd: string; // ISO — proponowany początek zakresu
  domyslnaDo: string; // ISO — proponowany koniec zakresu
  istnieje: (kadraId: string, dataISO: string) => boolean;
  onZapisz: (dane: Omit<WpisGrafiku, "id"> & { id?: string }) => void;
  onClose: () => void;
}) {
  // "*" = cała kadra
  const [ktoId, setKtoId] = useState<string>("*");
  const [godzinaOd, setGodzinaOd] = useState("08:00");
  const [godzinaDo, setGodzinaDo] = useState("16:00");
  const [typ, setTyp] = useState<TypZajec>("grupowe");
  const [zadanie, setZadanie] = useState("");
  const [dniTyg, setDniTyg] = useState<number[]>([1, 2, 3, 4, 5]); // dni robocze
  const [odDnia, setOdDnia] = useState(domyslnaOd);
  const [doDnia, setDoDnia] = useState(domyslnaDo);
  const [pomijajZajete, setPomijajZajete] = useState(true);

  function przelaczDzien(dow: number) {
    setDniTyg((stan) =>
      stan.includes(dow) ? stan.filter((x) => x !== dow) : [...stan, dow],
    );
  }

  // przy wyborze konkretnej osoby — podstaw jej domyślne godziny
  function wybierzOsobe(id: string) {
    setKtoId(id);
    const o = kadra.find((x) => x.id === id);
    if (o) {
      setGodzinaOd(o.godzinaOd || "08:00");
      setGodzinaDo(o.godzinaDo || "16:00");
      setTyp(o.typDomyslny ?? "grupowe");
    }
  }

  const osoby = ktoId === "*" ? kadra : kadra.filter((o) => o.id === ktoId);
  const daty = useMemo(
    () => generujDaty(odDnia, doDnia, dniTyg),
    [odDnia, doDnia, dniTyg],
  );

  // ile wpisów realnie powstanie (po pominięciu zajętych)
  const doWstawienia = useMemo(() => {
    let n = 0;
    for (const o of osoby) {
      for (const d of daty) {
        if (pomijajZajete && istnieje(o.id, d)) continue;
        n++;
      }
    }
    return n;
  }, [osoby, daty, pomijajZajete, istnieje]);

  const bledneGodziny = liczbaGodzin(godzinaOd, godzinaDo) <= 0;
  const mozna = osoby.length > 0 && daty.length > 0 && !bledneGodziny;

  function zastosuj() {
    if (!mozna) return;
    for (const o of osoby) {
      for (const d of daty) {
        if (pomijajZajete && istnieje(o.id, d)) continue;
        onZapisz({
          kadraId: o.id,
          data: d,
          godzinaOd,
          godzinaDo,
          typ,
          zadanie: zadanie.trim(),
        });
      }
    }
    onClose();
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
              Wypełnij grafik
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
              <label className={etyk}>Kogo dotyczy</label>
              <select
                value={ktoId}
                onChange={(e) => wybierzOsobe(e.target.value)}
                className={pole}
              >
                <option value="*">Cała kadra ({kadra.length})</option>
                {kadra.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.imie} {o.nazwisko}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etyk}>Od godz.</label>
                <input
                  type="time"
                  value={godzinaOd}
                  onChange={(e) => setGodzinaOd(e.target.value)}
                  className={pole}
                />
              </div>
              <div>
                <label className={etyk}>Do godz.</label>
                <input
                  type="time"
                  value={godzinaDo}
                  onChange={(e) => setGodzinaDo(e.target.value)}
                  className={pole}
                />
              </div>
            </div>

            <div>
              <label className={etyk}>Rodzaj zajęć</label>
              <div className="flex gap-1.5">
                {(["grupowe", "indywidualne"] as TypZajec[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTyp(t)}
                    className={`flex-1 rounded-lg px-2 py-2 text-[12.5px] font-semibold transition-all ${
                      typ === t
                        ? "bg-primary text-white"
                        : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
                    }`}
                  >
                    {t === "grupowe" ? "Grupowe" : "Indywidualne"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={etyk}>
                Realizowane zadanie / forma wsparcia (opcjonalnie)
              </label>
              <input
                value={zadanie}
                onChange={(e) => setZadanie(e.target.value)}
                placeholder="np. Reintegracja zawodowa"
                className={pole}
              />
            </div>

            <div className="rounded-xl border border-line bg-soft/40 p-3.5">
              <label className={etyk}>Powtarzaj w dni tygodnia</label>
              <div className="flex flex-wrap gap-1.5">
                {DNI_TYG.map((d) => (
                  <button
                    key={d.dow}
                    type="button"
                    onClick={() => przelaczDzien(d.dow)}
                    className={`h-8 w-9 rounded-lg text-[12px] font-semibold transition-all ${
                      dniTyg.includes(d.dow)
                        ? "bg-primary text-white"
                        : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDniTyg([1, 2, 3, 4, 5])}
                  className="ml-1 rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-[11.5px] font-semibold text-ink-mid hover:bg-soft"
                >
                  Dni robocze
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={etyk}>Od dnia</label>
                  <input
                    type="date"
                    value={odDnia}
                    onChange={(e) => setOdDnia(e.target.value)}
                    className={pole}
                  />
                </div>
                <div>
                  <label className={etyk}>Do dnia</label>
                  <input
                    type="date"
                    value={doDnia}
                    min={odDnia}
                    onChange={(e) => setDoDnia(e.target.value)}
                    className={pole}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-[13px] text-ink-mid">
              <input
                type="checkbox"
                checked={pomijajZajete}
                onChange={(e) => setPomijajZajete(e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.52_0.09_152)]"
              />
              Pomiń dni, które już mają wpis (nie nadpisuj)
            </label>

            <div className="rounded-lg bg-green-soft px-3.5 py-2.5 text-[12.5px] text-primary-strong">
              {bledneGodziny
                ? "Sprawdź godziny — „do” musi być po „od”."
                : daty.length === 0
                  ? "Wybierz dni tygodnia i zakres dat."
                  : `Powstanie ${doWstawienia} ${odmianaDni(doWstawienia)} pracy (${osoby.length === 1 ? "1 osoba" : `${osoby.length} osób`}, ${daty.length} ${odmianaDni(daty.length)} w zakresie).`}
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
              onClick={zastosuj}
              disabled={!mozna || doWstawienia === 0}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Wypełnij ({doWstawienia})
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
