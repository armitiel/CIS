"use client";

// Responsywny przełącznik projektu w menu bocznym. Zastępuje natywny <select>,
// którego opcji nie da się ostylować: zamknięty pokazuje skrót (mieści się
// w wąskim pasku), rozwinięty — pełne nazwy zawinięte w czytelnym panelu.

import { useEffect, useRef, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import NowyProjekt from "@/components/NowyProjekt";

export default function WyborProjektu() {
  const { projekt, projekty, zmienProjekt, usunProjekt, projektWlasny } =
    useProjekt();
  const [otwarte, setOtwarte] = useState(false);
  const [pokazNowy, setPokazNowy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function klik(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOtwarte(false);
      }
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOtwarte(false);
    }
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", esc);
    };
  }, []);

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
          className="absolute left-0 top-full z-30 mt-1.5 w-[290px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_30px_rgb(0_0_0/0.16)]"
        >
          {projekty.map((p) => {
            const aktywny = p.id === projekt.id;
            return (
              <button
                key={p.id}
                role="option"
                aria-selected={aktywny}
                onClick={() => {
                  zmienProjekt(p.id);
                  setOtwarte(false);
                }}
                className={`block w-full border-b border-line-soft px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                  aktywny ? "bg-green-soft/60" : "hover:bg-soft"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span
                    className={`material-symbols-rounded notranslate mt-px shrink-0 text-[18px] ${
                      aktywny ? "text-primary-strong" : "text-transparent"
                    }`}
                  >
                    check
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] leading-snug ${
                        aktywny
                          ? "font-bold text-primary-strong"
                          : "font-semibold text-ink"
                      }`}
                    >
                      {p.nazwa}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {p.nabor}
                    </span>
                  </span>
                </span>
              </button>
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
