"use client";

// Popup wyboru WIELU uczestników — widok wzorowany na liście w zakładce
// Uczestnicy (checkbox, avatar, ścieżka, status, frekwencja, braki).
// Używany m.in. w module Dokumenty do generowania z szablonów własnych
// dla dowolnego podzbioru uczestników.

import { useMemo, useState } from "react";
import { brakiWTeczce, type SpecyfikacjaProjektu } from "@/lib/projekt-spec";
import { Avatar, BrakiPill, SciezkaPill, StatusPill } from "@/components/ui";
import Portal from "@/components/Portal";
import type { KategoriaUczestnika, Uczestnik } from "@/lib/types";

type FiltrKategorii = "wszyscy" | KategoriaUczestnika;

export default function WyborUczestnikow({
  uczestnicy,
  spec,
  tytul,
  podtytul,
  etykieta = "Wybierz",
  onClose,
  onConfirm,
}: {
  uczestnicy: Uczestnik[];
  spec: SpecyfikacjaProjektu;
  tytul: string;
  podtytul?: string;
  /** etykieta przycisku potwierdzenia (do licznika dopisywany jest rozmiar wyboru) */
  etykieta?: string;
  onClose: () => void;
  onConfirm: (wybrani: Uczestnik[]) => void;
}) {
  const [szukaj, setSzukaj] = useState("");
  const [kategoria, setKategoria] = useState<FiltrKategorii>("wszyscy");
  const [zaznaczeni, setZaznaczeni] = useState<Set<string>>(new Set());

  const widoczni = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    return uczestnicy.filter((u) => {
      if (kategoria !== "wszyscy" && u.kategoria !== kategoria) return false;
      if (q && !`${u.imie} ${u.nazwisko}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [uczestnicy, szukaj, kategoria]);

  function przelacz(id: string) {
    setZaznaczeni((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const wszyscyWidoczniZaznaczeni =
    widoczni.length > 0 && widoczni.every((u) => zaznaczeni.has(u.id));

  function przelaczWidocznych() {
    setZaznaczeni((s) =>
      wszyscyWidoczniZaznaczeni
        ? new Set([...s].filter((id) => !widoczni.some((u) => u.id === id)))
        : new Set([...s, ...widoczni.map((u) => u.id)]),
    );
  }

  const nIPZS = uczestnicy.filter((u) => u.kategoria === "bezrobotny").length;
  const nIPR = uczestnicy.filter((u) => u.kategoria === "bierny").length;
  const chipy: [FiltrKategorii, string, number][] = [
    ["wszyscy", "Wszyscy", uczestnicy.length],
    ["bezrobotny", "IPZS", nIPZS],
    ["bierny", "IPR", nIPR],
  ];

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
              {tytul}
            </h3>
            {podtytul && (
              <p className="m-0 mt-0.5 text-xs text-muted">{podtytul}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-ink"
            title="Zamknij"
          >
            <span className="material-symbols-rounded notranslate text-[22px]">close</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-soft px-5 py-3">
          {chipy.map(([wart, label, n]) => (
            <button
              key={wart}
              onClick={() => setKategoria(wart)}
              className={`cursor-pointer rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                kategoria === wart
                  ? "bg-primary text-white"
                  : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
              }`}
            >
              {label} · {n}
            </button>
          ))}
          <input
            type="search"
            value={szukaj}
            onChange={(e) => setSzukaj(e.target.value)}
            placeholder="Szukaj po imieniu i nazwisku…"
            className="ml-auto w-56 rounded-xl border border-line-strong bg-surface px-3 py-[7px] text-sm text-ink outline-none"
          />
        </div>

        <div className="grid grid-cols-[28px_minmax(180px,1.6fr)_120px_110px] items-center gap-4 border-b border-line px-5 py-2.5">
          <input
            type="checkbox"
            checked={wszyscyWidoczniZaznaczeni}
            onChange={przelaczWidocznych}
            className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
            title="Zaznacz wszystkich widocznych"
          />
          <div className="th-label">Uczestnik</div>
          <div className="th-label">Obecność</div>
          <div className="th-label">Dokumenty</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {widoczni.map((u) => {
            const nazwa = `${u.imie} ${u.nazwisko}`;
            const braki = brakiWTeczce(u, spec).length;
            return (
              <label
                key={u.id}
                className={`grid cursor-pointer grid-cols-[28px_minmax(180px,1.6fr)_120px_110px] items-center gap-4 border-t border-line-soft px-5 py-2.5 transition-colors ${
                  zaznaczeni.has(u.id)
                    ? "bg-green-soft/40"
                    : "hover:bg-hover-row"
                }`}
              >
                <input
                  type="checkbox"
                  checked={zaznaczeni.has(u.id)}
                  onChange={() => przelacz(u.id)}
                  className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
                />
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar nazwa={nazwa} size={34} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-ink">
                      {u.nazwisko} {u.imie}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1.5">
                      <SciezkaPill sciezka={u.sciezka} />
                      {u.status !== "aktywny" && (
                        <StatusPill status={u.status} />
                      )}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-mid">
                  <span className="material-symbols-rounded notranslate text-[18px] text-faint">
                    event_available
                  </span>
                  {u.status === "aktywny" ? `${u.frekwencja}%` : "—"}
                </span>
                <span>
                  <BrakiPill braki={braki} />
                </span>
              </label>
            );
          })}
          {widoczni.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-faint">
              Brak wyników dla podanych filtrów.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            Zaznaczono {zaznaczeni.size} z {uczestnicy.length} uczestników
            {zaznaczeni.size > 1 ? " — pliki trafią do jednego ZIP" : ""}
          </span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => setZaznaczeni(new Set())}
              disabled={zaznaczeni.size === 0}
              className="text-xs font-semibold text-muted hover:underline disabled:opacity-50"
            >
              wyczyść
            </button>
            <button
              onClick={() =>
                onConfirm(uczestnicy.filter((u) => zaznaczeni.has(u.id)))
              }
              disabled={zaznaczeni.size === 0}
              className="btn-primary"
            >
              <span className="material-symbols-rounded notranslate text-[19px]">
                task_alt
              </span>
              {etykieta} ({zaznaczeni.size})
            </button>
          </span>
        </div>
      </div>
    </div>
    </Portal>
  );
}
