"use client";

// Panel dodawania/edycji zajęć w harmonogramie (etap E4).

import { useMemo, useState } from "react";
import Portal from "@/components/Portal";
import type { KolorZajec } from "@/lib/types";
import type { Zajecie } from "@/lib/use-zajecia";

const KOLORY: { id: KolorZajec; label: string; klasa: string }[] = [
  { id: "green", label: "Zielony", klasa: "bg-green-soft text-primary-strong" },
  { id: "blue", label: "Niebieski", klasa: "bg-blue-soft text-blue-ink" },
  { id: "amber", label: "Bursztyn", klasa: "bg-amber-soft text-amber-ink" },
];

type Powtarzanie =
  | "brak"
  | "co_tydzien"
  | "wybrane_dni"
  | "co_2_tyg"
  | "dni_robocze";

const POWT_OPCJE: { id: Powtarzanie; label: string }[] = [
  { id: "brak", label: "Jednorazowo" },
  { id: "co_tydzien", label: "Co tydzień" },
  { id: "wybrane_dni", label: "Wybrane dni tygodnia" },
  { id: "co_2_tyg", label: "Co dwa tygodnie" },
  { id: "dni_robocze", label: "Codziennie (dni robocze)" },
];

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
const isoZDaty = (d: Date) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function nowaSeria(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Lista dat ISO dla wybranego wzorca powtarzania (do daty końcowej włącznie). */
function generujDaty(
  startISO: string,
  powt: Powtarzanie,
  dni: number[],
  doISO: string,
): string[] {
  if (powt === "brak") return [startISO];
  const start = parseISO(startISO);
  const koniec = doISO ? parseISO(doISO) : start;
  if (koniec < start) return [startISO];

  const out: string[] = [];
  const kursor = new Date(start);
  let guard = 0;

  if (powt === "co_tydzien" || powt === "co_2_tyg") {
    const krok = powt === "co_2_tyg" ? 14 : 7;
    while (kursor <= koniec && guard++ < 520) {
      out.push(isoZDaty(kursor));
      kursor.setDate(kursor.getDate() + krok);
    }
  } else {
    const zbior =
      powt === "dni_robocze"
        ? [1, 2, 3, 4, 5]
        : dni.length
          ? dni
          : [start.getDay()];
    while (kursor <= koniec && guard++ < 1100) {
      if (zbior.includes(kursor.getDay())) out.push(isoZDaty(kursor));
      kursor.setDate(kursor.getDate() + 1);
    }
  }
  return out.length ? out : [startISO];
}

export default function ZajeciaPanel({
  zajecie,
  domyslnaData,
  onZapisz,
  onZapiszSerie,
  onUsun,
  onClose,
}: {
  zajecie: Zajecie | null;
  domyslnaData: string;
  onZapisz: (dane: Omit<Zajecie, "id"> & { id?: string }) => void;
  onZapiszSerie: (lista: (Omit<Zajecie, "id"> & { id?: string })[]) => void;
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

  // Cykliczność (tylko przy tworzeniu nowych zajęć).
  const [powtarzanie, setPowtarzanie] = useState<Powtarzanie>("brak");
  const [dniTyg, setDniTyg] = useState<number[]>([]);
  const [doDnia, setDoDnia] = useState("");

  const cykliczne = !zajecie && powtarzanie !== "brak";
  const pokazDni = powtarzanie === "wybrane_dni";
  const brakDatyKoncowej = cykliczne && !doDnia;

  const terminy = useMemo(
    () => (cykliczne ? generujDaty(data, powtarzanie, dniTyg, doDnia) : [data]),
    [cykliczne, data, powtarzanie, dniTyg, doDnia],
  );

  function przelaczDzien(dow: number) {
    setDniTyg((stan) =>
      stan.includes(dow) ? stan.filter((x) => x !== dow) : [...stan, dow],
    );
  }

  function zapisz() {
    if (!nazwa.trim() || brakDatyKoncowej) return;
    const wspolne = {
      nazwa: nazwa.trim(),
      typ: typ.trim(),
      prowadzacy: prowadzacy.trim(),
      grupa: grupa.trim(),
      godzina,
      godzinaDo,
      kolor,
      osob: Number(osob) || 0,
    };

    // Nowa seria cykliczna → kilka terminów ze wspólnym ID serii.
    if (cykliczne && terminy.length > 1) {
      const seria = nowaSeria();
      onZapiszSerie(terminy.map((d) => ({ ...wspolne, data: d, seria })));
      onClose();
      return;
    }

    // Pojedynczy termin lub edycja (hook obejmie serię, jeśli zajecie ją ma).
    onZapisz({
      id: zajecie?.id,
      ...wspolne,
      data,
      seria: zajecie?.seria ?? null,
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

            {/* Cykliczność — dostępna przy tworzeniu nowych zajęć */}
            {!zajecie && (
              <div className="rounded-xl border border-line bg-soft/50 p-3.5">
                <label className={etyk}>Powtarzanie</label>
                <select
                  value={powtarzanie}
                  onChange={(e) => {
                    const p = e.target.value as Powtarzanie;
                    setPowtarzanie(p);
                    if (p === "wybrane_dni" && dniTyg.length === 0) {
                      setDniTyg([parseISO(data).getDay()]);
                    }
                  }}
                  className={pole}
                >
                  {POWT_OPCJE.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {pokazDni && (
                  <div className="mt-3">
                    <label className={etyk}>Dni tygodnia</label>
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
                    </div>
                  </div>
                )}

                {cykliczne && (
                  <div className="mt-3">
                    <label className={etyk}>Powtarzaj do dnia</label>
                    <input
                      type="date"
                      value={doDnia}
                      min={data}
                      onChange={(e) => setDoDnia(e.target.value)}
                      className={pole}
                    />
                    <p className="mt-2 text-[12px] text-muted">
                      {brakDatyKoncowej
                        ? "Podaj datę końcową, aby wygenerować serię terminów."
                        : `Zostanie utworzonych ${terminy.length} ${
                            terminy.length === 1
                              ? "termin"
                              : terminy.length % 10 >= 2 &&
                                  terminy.length % 10 <= 4 &&
                                  !(terminy.length % 100 >= 12 &&
                                    terminy.length % 100 <= 14)
                                ? "terminy"
                                : "terminów"
                          } — od ${terminy[0]} do ${terminy[terminy.length - 1]}.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Edycja terminu należącego do serii cyklicznej */}
            {zajecie?.seria && (
              <p className="rounded-lg bg-amber-soft/40 px-3 py-2 text-[12px] text-amber-ink">
                Te zajęcia są częścią serii cyklicznej. Zapis zmieni wszystkie
                terminy serii (poza ich datami), a usunięcie skasuje całą serię.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
            {zajecie ? (
              <button
                onClick={() => {
                  const pyt = zajecie.seria
                    ? "Usunąć całą serię tych zajęć z harmonogramu?"
                    : "Usunąć te zajęcia z harmonogramu?";
                  if (window.confirm(pyt)) {
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
                disabled={!nazwa.trim() || brakDatyKoncowej}
                className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {cykliczne && terminy.length > 1
                  ? `Zapisz ${terminy.length} terminów`
                  : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
