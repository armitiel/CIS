"use client";

// Import harmonogramu: wgranie pliku (Excel/CSV lub Word/PDF/TXT) albo
// wygenerowanie propozycji na okres projektu → podgląd z edycją i zaznaczaniem
// → zapis zaznaczonych wpisów do harmonogramu.

import { useRef, useState } from "react";
import {
  parsujPlikHarmonogramu,
  propozycjaNaOkres,
  type WpisHarmonogramu,
} from "@/lib/import-harmonogramu";

type Pozycja = WpisHarmonogramu & { wybrany: boolean };

export default function ImportHarmonogramu({
  okres,
  onZapisz,
  onClose,
}: {
  okres: string;
  onZapisz: (wpisy: WpisHarmonogramu[]) => void;
  onClose: () => void;
}) {
  const [pozycje, setPozycje] = useState<Pozycja[]>([]);
  const [uwagi, setUwagi] = useState<string[]>([]);
  const [laduje, setLaduje] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function zaladuj(wpisy: WpisHarmonogramu[], u: string[]) {
    setPozycje(wpisy.map((w) => ({ ...w, wybrany: true })));
    setUwagi(u);
  }

  async function obsluzPlik(file: File | undefined) {
    if (!file) return;
    setLaduje(true);
    setBlad(null);
    try {
      const wynik = await parsujPlikHarmonogramu(file);
      zaladuj(wynik.wpisy, wynik.uwagi);
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się wczytać pliku.");
    } finally {
      setLaduje(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function generujPropozycje() {
    setBlad(null);
    const wynik = propozycjaNaOkres(okres);
    zaladuj(wynik.wpisy, wynik.uwagi);
  }

  function ustaw(i: number, pole: keyof Pozycja, val: string | boolean) {
    setPozycje((s) =>
      s.map((p, j) => (j === i ? { ...p, [pole]: val } : p)),
    );
  }

  const zaznaczone = pozycje.filter((p) => p.wybrany && p.data);

  function zapisz() {
    if (zaznaczone.length === 0) return;
    onZapisz(
      zaznaczone.map((p) => ({
        data: p.data,
        godzina: p.godzina,
        godzinaDo: p.godzinaDo,
        nazwa: p.nazwa,
        typ: p.typ,
        prowadzacy: p.prowadzacy,
        grupa: p.grupa,
        kolor: p.kolor,
        osob: p.osob,
      })),
    );
    onClose();
  }

  const inp =
    "w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
            Import harmonogramu
          </h3>
          <button
            onClick={onClose}
            className="text-faint hover:text-ink"
            title="Zamknij"
          >
            <span className="material-symbols-rounded notranslate text-[22px]">
              close
            </span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.pdf,.txt"
              className="hidden"
              onChange={(e) => obsluzPlik(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={laduje}
              className="btn-primary"
            >
              <span className="material-symbols-rounded notranslate text-[19px]">
                upload_file
              </span>
              {laduje ? "Wczytuję…" : "Wgraj plik (Excel/CSV/Word/PDF)"}
            </button>
            <button onClick={generujPropozycje} className="btn-dark">
              <span className="material-symbols-rounded notranslate text-[18px]">
                auto_awesome
              </span>
              Wygeneruj propozycję na okres
            </button>
          </div>

          <p className="m-0 text-xs text-faint">
            Tabela (Excel/CSV): kolumny rozpoznawane automatycznie (data,
            godziny, nazwa, prowadzący, grupa, typ). Dokument (Word/PDF):
            rozpoznawanie linii z datą i godzinami. Wszystko trafia do podglądu —
            nic nie zapisuje się bez Twojej akceptacji.
          </p>

          {blad && (
            <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red-ink">
              {blad}
            </div>
          )}
          {uwagi.length > 0 && (
            <div className="rounded-xl bg-soft px-4 py-2.5 text-xs text-ink-mid">
              {uwagi.map((u, i) => (
                <p key={i} className="m-0">
                  {u}
                </p>
              ))}
            </div>
          )}

          {pozycje.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[28px_110px_70px_70px_1fr_110px_60px] items-center gap-2 border-b border-line bg-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                <span />
                <span>Data</span>
                <span>Od</span>
                <span>Do</span>
                <span>Nazwa zajęć</span>
                <span>Prowadzący</span>
                <span>Grupa</span>
              </div>
              <div className="max-h-[46vh] overflow-y-auto">
                {pozycje.map((p, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[28px_110px_70px_70px_1fr_110px_60px] items-center gap-2 border-t border-line-soft px-3 py-1.5 ${
                      p.wybrany ? "" : "opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={p.wybrany}
                      onChange={(e) => ustaw(i, "wybrany", e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
                    />
                    <input
                      type="date"
                      value={p.data}
                      onChange={(e) => ustaw(i, "data", e.target.value)}
                      className={inp}
                    />
                    <input
                      value={p.godzina}
                      onChange={(e) => ustaw(i, "godzina", e.target.value)}
                      placeholder="09:00"
                      className={inp}
                    />
                    <input
                      value={p.godzinaDo}
                      onChange={(e) => ustaw(i, "godzinaDo", e.target.value)}
                      placeholder="12:00"
                      className={inp}
                    />
                    <input
                      value={p.nazwa}
                      onChange={(e) => ustaw(i, "nazwa", e.target.value)}
                      className={inp}
                    />
                    <input
                      value={p.prowadzacy}
                      onChange={(e) => ustaw(i, "prowadzacy", e.target.value)}
                      className={inp}
                    />
                    <input
                      value={p.grupa}
                      onChange={(e) => ustaw(i, "grupa", e.target.value)}
                      className={inp}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            {pozycje.length > 0
              ? `Zaznaczono ${zaznaczone.length} z ${pozycje.length} pozycji`
              : "Wgraj plik lub wygeneruj propozycję"}
          </span>
          <button
            onClick={zapisz}
            disabled={zaznaczone.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              event_available
            </span>
            Dodaj do harmonogramu ({zaznaczone.length})
          </button>
        </div>
      </div>
    </div>
  );
}
