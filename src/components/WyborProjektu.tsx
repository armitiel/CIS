"use client";

// Responsywny przełącznik projektu w menu bocznym. Zastępuje natywny <select>,
// którego opcji nie da się ostylować: zamknięty pokazuje skrót (mieści się
// w wąskim pasku), rozwinięty — pełne nazwy (przycięte do 2 linii) w panelu
// dopasowanym do szerokości ekranu. Projekty własne można edytować (skrót +
// pełna nazwa) i usuwać.

import { useEffect, useRef, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import NowyProjekt from "@/components/NowyProjekt";

export default function WyborProjektu() {
  const {
    projekt,
    projekty,
    zmienProjekt,
    usunProjekt,
    aktualizujProjekt,
    projektWlasny,
  } = useProjekt();
  const [otwarte, setOtwarte] = useState(false);
  const [pokazNowy, setPokazNowy] = useState(false);
  const [edytowanyId, setEdytowanyId] = useState<string | null>(null);
  const [edSkrot, setEdSkrot] = useState("");
  const [edNazwa, setEdNazwa] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klik(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOtwarte(false);
        setEdytowanyId(null);
      }
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOtwarte(false);
        setEdytowanyId(null);
      }
    }
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  function rozpocznijEdycje(id: string, skrot: string, nazwa: string) {
    setEdytowanyId(id);
    setEdSkrot(skrot);
    setEdNazwa(nazwa);
  }

  function zapiszEdycje() {
    if (!edytowanyId) return;
    const skrot = edSkrot.trim();
    const nazwa = edNazwa.trim();
    if (!skrot && !nazwa) return;
    aktualizujProjekt(edytowanyId, {
      ...(skrot ? { skrot } : {}),
      ...(nazwa ? { nazwa } : {}),
    });
    setEdytowanyId(null);
  }

  const wlasny = (id: string) =>
    !["cis-2026", "swa-6.8"].includes(id);

  const pole =
    "w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div ref={ref} className="relative mx-1 mb-4">
      <button
        onClick={() => setOtwarte((o) => !o)}
        title={`${projekt.nazwa} (${projekt.nabor})`}
        aria-haspopup="listbox"
        aria-expanded={otwarte}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-left outline-none transition-colors hover:bg-soft"
      >
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {projekt.skrot}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {projekt.nabor}
          </span>
        </span>
        <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-faint">
          unfold_more
        </span>
      </button>

      {otwarte && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_30px_rgb(0_0_0/0.16)]"
        >
          {projekty.map((p) => {
            const aktywny = p.id === projekt.id;
            const wEdycji = edytowanyId === p.id;

            if (wEdycji) {
              return (
                <div
                  key={p.id}
                  className="border-b border-line-soft bg-soft/40 px-3 py-2.5 last:border-b-0"
                >
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-faint">
                    Skrót (w menu)
                  </label>
                  <input
                    value={edSkrot}
                    onChange={(e) => setEdSkrot(e.target.value)}
                    className={pole}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && zapiszEdycje()}
                  />
                  <label className="mb-1 mt-2 block text-[10.5px] font-semibold uppercase tracking-wide text-faint">
                    Pełna nazwa
                  </label>
                  <textarea
                    value={edNazwa}
                    onChange={(e) => setEdNazwa(e.target.value)}
                    rows={2}
                    className={`${pole} resize-none`}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={zapiszEdycje}
                      className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-[12px] font-semibold text-white"
                    >
                      Zapisz
                    </button>
                    <button
                      onClick={() => setEdytowanyId(null)}
                      className="rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] font-semibold text-ink-mid hover:bg-soft"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={`flex items-start gap-1 border-b border-line-soft last:border-b-0 ${
                  aktywny ? "bg-green-soft/60" : "hover:bg-soft"
                }`}
              >
                <button
                  role="option"
                  aria-selected={aktywny}
                  title={`${p.nazwa} (${p.nabor})`}
                  onClick={() => {
                    zmienProjekt(p.id);
                    setOtwarte(false);
                  }}
                  className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left"
                >
                  <span
                    className={`material-symbols-rounded notranslate mt-px shrink-0 text-[18px] ${
                      aktywny ? "text-primary-strong" : "text-transparent"
                    }`}
                  >
                    check
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block line-clamp-2 break-words text-[13px] leading-snug ${
                        aktywny
                          ? "font-bold text-primary-strong"
                          : "font-semibold text-ink"
                      }`}
                    >
                      {p.nazwa}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {p.nabor}
                    </span>
                  </span>
                </button>
                {wlasny(p.id) && (
                  <button
                    onClick={() => rozpocznijEdycje(p.id, p.skrot, p.nazwa)}
                    className="mr-1 mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-surface hover:text-primary-strong"
                    title="Edytuj nazwę projektu"
                  >
                    <span className="material-symbols-rounded notranslate text-[17px]">
                      edit
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {/* + Nowy projekt (dane z wczytanego wniosku albo ręcznie) */}
          <button
            onClick={() => {
              setOtwarte(false);
              setPokazNowy(true);
            }}
            className="block w-full border-t border-line px-3 py-2.5 text-left transition-colors hover:bg-soft"
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-primary-strong">
              <span className="material-symbols-rounded notranslate text-[18px]">
                add_circle
              </span>
              Nowy projekt…
            </span>
            <span className="mt-0.5 block pl-[26px] text-[11px] text-muted">
              dane z wniosku (.docx/.txt) albo ręcznie
            </span>
          </button>

          {/* usuwanie aktywnego projektu własnego */}
          {projektWlasny && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Usunąć projekt „${projekt.skrot}” wraz z jego bazą uczestników (zapis lokalny)?`,
                  )
                ) {
                  usunProjekt(projekt.id);
                  setOtwarte(false);
                }
              }}
              className="block w-full border-t border-line-soft px-3 py-2 text-left transition-colors hover:bg-red-soft/40"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-red-ink">
                <span className="material-symbols-rounded notranslate text-[16px]">
                  delete
                </span>
                Usuń projekt „{projekt.skrot}”
              </span>
            </button>
          )}
        </div>
      )}

      {pokazNowy && <NowyProjekt onClose={() => setPokazNowy(false)} />}
    </div>
  );
}
