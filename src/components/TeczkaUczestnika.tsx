"use client";

// Teczka dokumentów pojedynczego uczestnika: lista wymaganych dokumentów
// (silnik reguł), generowanie per dokument, pakiet braków oraz szablony własne.
// Używana w kartotece uczestnika — perspektywa osobowa, w odróżnieniu od
// modułu Dokumenty (perspektywa projektowa: katalog, generowanie zbiorcze).

import { useEffect, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import {
  brakiWTeczce,
  dokumentyAdHoc,
  wymaganeDokumenty,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import { dokumentBlob, generujDokument, generujPakiet } from "@/lib/generator";
import { podgladDocx, type LiniaPodgladu } from "@/lib/podglad-docx";
import {
  arrayBufferZBase64,
  generujZSzablonu,
  wczytajSzablony,
  type SzablonZapisany,
} from "@/lib/szablony";
import { BrakiPill } from "@/components/ui";
import Portal from "@/components/Portal";
import type { Uczestnik } from "@/lib/types";

export default function TeczkaUczestnika({ uczestnik }: { uczestnik: Uczestnik }) {
  const { projekt } = useProjekt();
  const spec = projekt.spec;
  const u = uczestnik;

  const [generuje, setGeneruje] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [szablony, setSzablony] = useState<SzablonZapisany[]>([]);
  const [podglad, setPodglad] = useState<{
    tytul: string;
    linie: LiniaPodgladu[];
  } | null>(null);
  const [podgladLaduje, setPodgladLaduje] = useState<string | null>(null);

  useEffect(() => {
    setSzablony(wczytajSzablony(projekt.id));
  }, [projekt.id]);

  const wymagane = wymaganeDokumenty(u, spec);
  const braki = brakiWTeczce(u, spec);
  const adHoc = dokumentyAdHoc(u, spec);

  async function pobierz(d: WymaganyDokument) {
    setGeneruje(d.id);
    try {
      await generujDokument(d, u, spec);
    } finally {
      setGeneruje(null);
    }
  }

  async function pobierzPakietBrakow() {
    const dokumenty = braki.filter((d) => d.generowalny);
    if (dokumenty.length === 0) return;
    setGeneruje("pakiet");
    try {
      await generujPakiet(dokumenty, u, spec);
    } finally {
      setGeneruje(null);
    }
  }

  /** Podgląd dokumentu wypełnionego danymi uczestnika. */
  async function pokazPodglad(d: WymaganyDokument) {
    setPodgladLaduje(d.id);
    try {
      const blob = await dokumentBlob(d, u, spec);
      setPodglad({
        tytul: `${d.symbol} · ${d.nazwa} — ${u.nazwisko} ${u.imie}`,
        linie: await podgladDocx(blob),
      });
    } catch (e) {
      setKomunikat(
        `Błąd podglądu: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    } finally {
      setPodgladLaduje(null);
    }
  }

  function zSzablonu(s: SzablonZapisany) {
    try {
      generujZSzablonu(arrayBufferZBase64(s.base64), s.nazwa, u, spec);
      setKomunikat(null);
    } catch (e) {
      setKomunikat(
        `Błąd szablonu: ${e instanceof Error ? e.message : "sprawdź znaczniki {{pole}}"}`,
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BrakiPill braki={braki.length} />
          <span className="text-[13px] text-muted">
            {wymagane.length - braki.length} z {wymagane.length} dokumentów w
            teczce
          </span>
        </div>
        <button
          onClick={pobierzPakietBrakow}
          disabled={
            braki.filter((b) => b.generowalny).length === 0 || generuje !== null
          }
          className="btn-primary"
        >
          <span className="material-symbols-rounded text-[19px]">download</span>
          {generuje === "pakiet" ? "Generuję…" : "Pakiet braków (.docx)"}
        </button>
      </div>

      {komunikat && (
        <div className="anim-fade-in mt-3 rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
          {komunikat}
        </div>
      )}

      <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
        {wymagane.map((d) => {
          const wTeczce = u.posiadaneDokumenty.includes(d.id);
          return (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">
                <span
                  className={wTeczce ? "text-primary-strong" : "text-amber-ink"}
                >
                  {wTeczce ? "✓" : "—"}
                </span>{" "}
                <span className="font-mono text-xs text-faint">{d.symbol}</span>{" "}
                <span className="text-ink">{d.nazwa}</span>
              </span>
              {d.generowalny ? (
                <span className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => pokazPodglad(d)}
                    disabled={podgladLaduje !== null}
                    className="rounded-lg border border-line-strong px-2 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                    title="Podgląd dokumentu z danymi uczestnika"
                  >
                    <span className="material-symbols-rounded align-middle text-[15px]">
                      visibility
                    </span>
                  </button>
                  <button
                    onClick={() => pobierz(d)}
                    disabled={generuje !== null}
                    className="rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                  >
                    {generuje === d.id ? "Generuję…" : "Pobierz .docx"}
                  </button>
                </span>
              ) : (
                <span className="text-xs text-faint">wystawia OPS/PUP</span>
              )}
            </li>
          );
        })}
      </ul>

      {adHoc.length > 0 && (
        <div className="mt-3 border-t border-line-soft pt-2.5">
          <p className="m-0 text-xs font-medium text-muted">
            Dokumenty „ad hoc” (gdy dotyczy):
          </p>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {adHoc.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  <span className="font-mono text-xs text-faint">
                    {d.symbol}
                  </span>{" "}
                  <span className="text-ink-mid">{d.nazwa}</span>
                </span>
                <button
                  onClick={() => pobierz(d)}
                  disabled={generuje !== null}
                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                >
                  {generuje === d.id ? "Generuję…" : "Pobierz .docx"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {szablony.length > 0 && (
        <div className="mt-3 border-t border-line-soft pt-2.5">
          <p className="m-0 text-xs font-medium text-muted">
            Szablony własne projektu:
          </p>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {szablony.map((s) => (
              <li
                key={s.nazwa}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-ink-mid">{s.nazwa}</span>
                <button
                  onClick={() => zSzablonu(s)}
                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft"
                >
                  Wypełnij danymi
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* POPUP: podgląd dokumentu */}
      {podglad && (
        <Portal>
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPodglad(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
              <h3 className="m-0 truncate text-sm font-semibold text-ink">
                {podglad.tytul}
              </h3>
              <button
                onClick={() => setPodglad(null)}
                className="shrink-0 text-faint hover:text-ink"
                title="Zamknij podgląd"
              >
                <span className="material-symbols-rounded text-[22px]">
                  close
                </span>
              </button>
            </div>
            <div className="overflow-y-auto bg-soft px-6 py-6">
              <div className="mx-auto max-w-[640px] rounded-md bg-white px-10 py-12 shadow-sm ring-1 ring-line-soft">
                {podglad.linie.map((l, i) =>
                  l.tekst === "" && !l.prawa ? (
                    <div key={i} className="h-3" />
                  ) : l.prawa !== undefined ? (
                    <p
                      key={i}
                      className={`m-0 flex justify-between gap-6 whitespace-pre-wrap py-0.5 text-[13px] leading-relaxed text-neutral-800 ${l.bold ? "font-semibold" : ""} ${l.italic ? "italic text-neutral-500" : ""}`}
                    >
                      <span>{l.tekst}</span>
                      <span>{l.prawa}</span>
                    </p>
                  ) : (
                    <p
                      key={i}
                      className={`m-0 whitespace-pre-wrap py-0.5 text-[13px] leading-relaxed text-neutral-800 ${l.bold ? "font-semibold" : ""} ${l.italic ? "italic text-neutral-500" : ""} ${l.center ? "text-center" : ""}`}
                    >
                      {l.tekst}
                    </p>
                  ),
                )}
                {podglad.linie.length === 0 && (
                  <p className="m-0 text-center text-sm text-neutral-400">
                    (pusty dokument)
                  </p>
                )}
              </div>
              <p className="mt-3 text-center text-xs text-faint">
                Podgląd poglądowy — układ wydruku w pliku .docx może się
                nieznacznie różnić.
              </p>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
