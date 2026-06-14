"use client";

// Widok zarządzania projektami: przełączanie aktywnego, edycja skrótu/nazwy,
// usuwanie (projekty własne) oraz dodawanie nowego projektu.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjekt } from "@/components/ProjektProvider";
import NowyProjekt from "@/components/NowyProjekt";
import { wykryjZestaw } from "@/lib/logotypy";

export default function Projekty() {
  const router = useRouter();
  const {
    projekt,
    projekty,
    uczestnicy,
    zmienProjekt,
    aktualizujProjekt,
    usunProjekt,
    czyWlasny,
  } = useProjekt();

  const [pokazNowy, setPokazNowy] = useState(false);
  const [edytowanyId, setEdytowanyId] = useState<string | null>(null);
  const [edSkrot, setEdSkrot] = useState("");
  const [edNazwa, setEdNazwa] = useState("");

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

  const pole =
    "w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div className="flex max-w-[1240px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">
          {projekty.length}{" "}
          {projekty.length === 1 ? "projekt" : "projekty/-ów"} · aktywny: „
          {projekt.skrot}”
        </p>
        <button
          onClick={() => setPokazNowy(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-rounded notranslate text-[18px]">
            add
          </span>
          Nowy projekt
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projekty.map((p, i) => {
          const aktywny = p.id === projekt.id;
          const wlasny = czyWlasny(p.id);
          const wEdycji = edytowanyId === p.id;
          const liczbaUczestnikow = aktywny
            ? uczestnicy.length
            : p.uczestnicyDomyslni.length;

          return (
            <div
              key={p.id}
              className={`card anim-card-in flex flex-col gap-3 p-5 ${
                aktywny ? "ring-2 ring-[oklch(0.62_0.09_152)]" : ""
              }`}
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              {wEdycji ? (
                <div className="flex flex-col gap-2">
                  <label className="th-label">Skrót (w menu)</label>
                  <input
                    value={edSkrot}
                    onChange={(e) => setEdSkrot(e.target.value)}
                    className={pole}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && zapiszEdycje()}
                  />
                  <label className="th-label mt-1">Pełna nazwa</label>
                  <textarea
                    value={edNazwa}
                    onChange={(e) => setEdNazwa(e.target.value)}
                    rows={3}
                    className={`${pole} resize-none`}
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={zapiszEdycje}
                      className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-[12.5px] font-semibold text-white"
                    >
                      Zapisz
                    </button>
                    <button
                      onClick={() => setEdytowanyId(null)}
                      className="rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-mid hover:bg-soft"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-soft text-primary-strong">
                      <span className="material-symbols-rounded notranslate text-[24px]">
                        workspaces
                      </span>
                    </span>
                    {aktywny ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11.5px] font-bold text-primary-strong">
                        <span className="material-symbols-rounded notranslate text-[15px]">
                          check_circle
                        </span>
                        aktywny
                      </span>
                    ) : (
                      <span className="rounded-full bg-soft px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                        {wlasny ? "własny" : "wbudowany"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="m-0 font-serif text-[18px] font-semibold leading-tight text-ink-strong">
                      {p.skrot}
                    </h2>
                    <p className="m-0 mt-1 line-clamp-2 text-[13px] leading-snug text-ink-mid">
                      {p.nazwa}
                    </p>
                  </div>

                  <dl className="m-0 flex flex-col gap-1 text-[12px] text-muted">
                    <div className="flex justify-between gap-3">
                      <dt className="text-faint">Nabór</dt>
                      <dd className="m-0 truncate text-right font-medium text-ink-mid">
                        {p.nabor}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-faint">Okres</dt>
                      <dd className="m-0 text-right font-medium text-ink-mid">
                        {p.spec.okres}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-faint">Program</dt>
                      <dd className="m-0 text-right font-medium text-ink-mid">
                        {wykryjZestaw(p.nabor).skrot}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-faint">Uczestnicy</dt>
                      <dd className="m-0 text-right font-medium text-ink-mid">
                        {liczbaUczestnikow}
                        {!aktywny && " (startowo)"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center gap-2 border-t border-line-soft pt-3">
                    {aktywny ? (
                      <button
                        onClick={() => router.push("/")}
                        className="flex-1 rounded-lg bg-soft px-3 py-2 text-[12.5px] font-semibold text-ink-mid transition-colors hover:bg-hover-row"
                      >
                        Otwórz pulpit
                      </button>
                    ) : (
                      <button
                        onClick={() => zmienProjekt(p.id)}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Ustaw jako aktywny
                      </button>
                    )}
                    {wlasny && (
                      <>
                        <button
                          onClick={() =>
                            rozpocznijEdycje(p.id, p.skrot, p.nazwa)
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-mid transition-colors hover:bg-soft"
                          title="Edytuj nazwę i skrót"
                        >
                          <span className="material-symbols-rounded notranslate text-[18px]">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Usunąć projekt „${p.skrot}” wraz z jego bazą uczestników? Tej operacji nie można cofnąć.`,
                              )
                            ) {
                              usunProjekt(p.id);
                            }
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong text-red-ink transition-colors hover:bg-red-soft/40"
                          title="Usuń projekt"
                        >
                          <span className="material-symbols-rounded notranslate text-[18px]">
                            delete
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Kafelek dodania nowego projektu */}
        <button
          onClick={() => setPokazNowy(true)}
          className="anim-card-in flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-[oklch(0.62_0.09_152)] hover:bg-soft hover:text-primary-strong"
        >
          <span className="material-symbols-rounded notranslate text-[34px]">
            add_circle
          </span>
          <span className="text-[13.5px] font-semibold">Nowy projekt</span>
          <span className="px-6 text-center text-[11.5px] text-faint">
            z wniosku (.docx/.txt) albo ręcznie
          </span>
        </button>
      </div>

      {pokazNowy && <NowyProjekt onClose={() => setPokazNowy(false)} />}
    </div>
  );
}
