"use client";

// Wierny podgląd pliku .docx w popupie — renderowanie biblioteką docx-preview
// (pełny układ: tabele, ramki, pogrubienia, strony). Pokazuje DOKŁADNIE ten
// plik, który użytkownik by pobrał — zero treści wpisanej na sztywno.

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

export default function PodgladDocxModal({
  tytul,
  blob,
  onClose,
}: {
  tytul: string;
  blob: Blob;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [blad, setBlad] = useState<string | null>(null);

  useEffect(() => {
    let aktywny = true;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    setBlad(null);
    renderAsync(blob, el, undefined, {
      inWrapper: true,
      ignoreLastRenderedPageBreak: true,
      breakPages: true,
    }).catch(() => {
      if (aktywny) setBlad("Nie udało się wyrenderować podglądu pliku.");
    });
    return () => {
      aktywny = false;
    };
  }, [blob]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h3 className="m-0 truncate text-sm font-semibold text-ink">
            {tytul}
          </h3>
          <button
            onClick={onClose}
            className="shrink-0 text-faint hover:text-ink"
            title="Zamknij podgląd"
          >
            <span className="material-symbols-rounded text-[22px]">close</span>
          </button>
        </div>
        <div className="overflow-y-auto bg-neutral-200/70">
          {blad ? (
            <p className="px-6 py-10 text-center text-sm text-red-ink">
              {blad}
            </p>
          ) : (
            <div ref={ref} className="podglad-docx" />
          )}
        </div>
        {/* docx-preview: tło sekcji i skalowanie strony do szerokości modala */}
        <style>{`
          .podglad-docx .docx-wrapper {
            background: transparent;
            padding: 18px 0;
          }
          .podglad-docx .docx-wrapper > section.docx {
            box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
            margin-bottom: 18px;
            max-width: 100%;
          }
        `}</style>
      </div>
    </div>
  );
}
