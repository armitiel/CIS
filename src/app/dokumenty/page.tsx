"use client";

import { useMemo, useRef, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import {
  brakiWTeczce,
  dokumentyAdHoc,
  sekcjeNazwy,
  wymaganeDokumenty,
  type Sekcja,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import { generujDokument, generujPakiet } from "@/lib/generator";
import { Avatar, BrakiPill } from "@/components/ui";

const rodzajLabel: Record<WymaganyDokument["rodzaj"], string> = {
  uczestnik: "teczka uczestnika",
  grupowy: "lista zbiorcza",
  kadrowy: "dokument kadrowy",
  organizacyjny: "organizacyjny",
};

const rodzajStyl: Record<WymaganyDokument["rodzaj"], string> = {
  uczestnik: "bg-blue-soft text-blue-ink",
  grupowy: "bg-soft text-ink-mid",
  kadrowy: "bg-soft text-muted",
  organizacyjny: "bg-teal-soft text-teal-ink",
};

export default function Dokumenty() {
  const { projekt, uczestnicy } = useProjekt();
  const spec = projekt.spec;

  const [wniosekNazwa, setWniosekNazwa] = useState<string | null>(null);
  const [rozpoznano, setRozpoznano] = useState(false);
  const [rozwiniety, setRozwiniety] = useState<string | null>(null);
  const [generuje, setGeneruje] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sekcje = useMemo(() => {
    const m = new Map<Sekcja, WymaganyDokument[]>();
    for (const d of spec.dokumenty) {
      m.set(d.sekcja, [...(m.get(d.sekcja) ?? []), d]);
    }
    return m;
  }, [spec]);

  function wczytajWniosek(file: File | undefined) {
    if (!file) return;
    setWniosekNazwa(file.name);
    setRozpoznano(false);
    setTimeout(() => setRozpoznano(true), 600);
  }

  async function pobierzDokument(d: WymaganyDokument, uczestnikId: string) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    if (!u) return;
    setGeneruje(`${uczestnikId}:${d.id}`);
    try {
      await generujDokument(d, u, spec);
    } finally {
      setGeneruje(null);
    }
  }

  async function pobierzPakiet(uczestnikId: string) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    if (!u) return;
    const dokumenty = brakiWTeczce(u, spec).filter((d) => d.generowalny);
    if (dokumenty.length === 0) return;
    setGeneruje(`${uczestnikId}:pakiet`);
    try {
      await generujPakiet(dokumenty, u, spec);
    } finally {
      setGeneruje(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* KROK 1: wniosek / specyfikacja */}
      <section className="card anim-card-in px-6 py-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              1. Wniosek / specyfikacja projektu
            </h2>
            <p className="m-0 mt-[5px] text-[13.5px] text-muted">
              Wczytaj wniosek o dofinansowanie, aby rozpoznać wymagane
              dokumenty
            </p>
            <div className="mt-[13px] inline-flex items-center gap-[7px] rounded-[10px] bg-green-soft px-[13px] py-[7px] text-[13px] font-semibold text-primary-strong">
              <span className="material-symbols-rounded text-lg">
                check_circle
              </span>
              Aktywna specyfikacja: {spec.nazwa} ({spec.nabor})
            </div>
            <p className="m-0 mt-2 text-xs text-faint">Źródło: {spec.zrodlo}</p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => wczytajWniosek(e.target.files?.[0])}
            />
            <button onClick={() => fileRef.current?.click()} className="btn-primary">
              <span className="material-symbols-rounded text-[19px]">
                upload_file
              </span>
              Wczytaj wniosek
            </button>
          </div>
        </div>

        {wniosekNazwa && (
          <div className="anim-fade-in mt-4 rounded-xl bg-soft px-4 py-3 text-sm">
            <p className="text-ink-mid">
              Plik: <span className="font-medium">{wniosekNazwa}</span>
            </p>
            {rozpoznano ? (
              <p className="mt-1 font-medium text-primary-strong">
                ✓ Rozpoznano projekt: {spec.nazwa}
              </p>
            ) : (
              <p className="mt-1 text-muted">Analizowanie…</p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {[...sekcje.entries()].map(([sekcja, dokumenty]) => (
            <details key={sekcja} className="rounded-xl border border-line">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-semibold text-ink hover:bg-hover-row">
                <span>{sekcjeNazwy[sekcja]}</span>
                <span className="text-xs font-normal text-faint">
                  {dokumenty.length} formularzy
                </span>
              </summary>
              <table className="w-full border-t border-line-soft text-left text-sm">
                <tbody className="divide-y divide-line-soft">
                  {dokumenty.map((d) => (
                    <tr key={d.id}>
                      <td className="w-24 px-4 py-2 align-top font-mono text-xs text-muted">
                        {d.symbol}
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-ink">{d.nazwa}</p>
                        <p className="text-xs text-faint">{d.opis}</p>
                        <p className="text-xs text-faint">
                          Podpisy: {d.podpisUczestnika}
                        </p>
                      </td>
                      <td className="w-40 px-4 py-2 align-top">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rodzajStyl[d.rodzaj]}`}
                        >
                          {rodzajLabel[d.rodzaj]}
                        </span>
                        {d.dotyczy !== "wszyscy" && (
                          <p className="mt-1 text-xs text-faint">
                            {d.dotyczy === "bezrobotny"
                              ? "bezrobotni (CIS)"
                              : "bierni zawodowo"}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Specyfikacja wbudowana — automatyczna analiza dowolnego wniosku (AI)
          to etap E6. Pełne odwzorowanie treści wzorów PDF — etap E5.
        </p>
      </section>

      {/* KROK 2: teczki i generowanie */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.1s" }}
      >
        <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
          2. Teczki uczestników i generowanie
        </h2>
        <p className="m-0 mt-[5px] text-[13.5px] text-muted">
          Silnik reguł wskazuje braki. Kliknij uczestnika, aby pobrać komplet
          dokumentów .docx.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-soft">
              <tr>
                <th className="th-label px-4 py-2">Uczestnik</th>
                <th className="th-label px-4 py-2">Wymagane</th>
                <th className="th-label px-4 py-2">W teczce</th>
                <th className="th-label px-4 py-2">Braki</th>
                <th className="th-label px-4 py-2">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {uczestnicy.map((u) => {
                const wymagane = wymaganeDokumenty(u, spec);
                const braki = brakiWTeczce(u, spec);
                const adHoc = dokumentyAdHoc(u, spec);
                const otwarty = rozwiniety === u.id;
                return (
                  <Wiersz
                    key={u.id}
                    otwarty={otwarty}
                    onToggle={() => setRozwiniety(otwarty ? null : u.id)}
                    naglowek={
                      <>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar nazwa={`${u.imie} ${u.nazwisko}`} size={36} />
                            <span className="font-bold text-ink">
                              {u.nazwisko} {u.imie}
                              <span className="ml-2 text-xs font-normal text-faint">
                                {u.sciezka} · {u.status}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-mid">
                          {wymagane.length}
                        </td>
                        <td className="px-4 py-3 text-ink-mid">
                          {wymagane.length - braki.length}
                        </td>
                        <td className="px-4 py-3">
                          <BrakiPill braki={braki.length} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pobierzPakiet(u.id);
                            }}
                            disabled={
                              braki.filter((b) => b.generowalny).length === 0 ||
                              generuje !== null
                            }
                            className="btn-dark"
                          >
                            {generuje === `${u.id}:pakiet`
                              ? "Generuję…"
                              : "Pakiet braków (.docx)"}
                          </button>
                        </td>
                      </>
                    }
                  >
                    <div className="space-y-3">
                      <ul className="space-y-1.5">
                        {wymagane.map((d) => {
                          const wTeczce = u.posiadaneDokumenty.includes(d.id);
                          const klucz = `${u.id}:${d.id}`;
                          return (
                            <li
                              key={d.id}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="text-sm">
                                <span
                                  className={
                                    wTeczce
                                      ? "text-primary-strong"
                                      : "text-amber-ink"
                                  }
                                >
                                  {wTeczce ? "✓" : "—"}
                                </span>{" "}
                                <span className="font-mono text-xs text-faint">
                                  {d.symbol}
                                </span>{" "}
                                <span className="text-ink">{d.nazwa}</span>
                              </span>
                              {d.generowalny ? (
                                <button
                                  onClick={() => pobierzDokument(d, u.id)}
                                  disabled={generuje !== null}
                                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                                >
                                  {generuje === klucz
                                    ? "Generuję…"
                                    : "Pobierz .docx"}
                                </button>
                              ) : (
                                <span className="text-xs text-faint">
                                  wystawia OPS/PUP
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {adHoc.length > 0 && (
                        <div className="border-t border-line-soft pt-2">
                          <p className="text-xs font-medium text-muted">
                            Dokumenty „ad hoc” (gdy dotyczy):
                          </p>
                          <ul className="mt-1 space-y-1">
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
                                  onClick={() => pobierzDokument(d, u.id)}
                                  disabled={generuje !== null}
                                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                                >
                                  {generuje === `${u.id}:${d.id}`
                                    ? "Generuję…"
                                    : "Pobierz .docx"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Wiersz>
                );
              })}
              {uczestnicy.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-faint">
                    Brak uczestników — zaimportuj bazę w module Uczestnicy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-faint">
          Dokumenty grupowe i kadrowe (listy obecności, dzienniki, protokoły)
          będą generowane z modułów Obecności i Harmonogram (etapy E2–E4).
        </p>
      </section>
    </div>
  );
}

function Wiersz({
  naglowek,
  children,
  otwarty,
  onToggle,
}: {
  naglowek: React.ReactNode;
  children: React.ReactNode;
  otwarty: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-hover-row"
        title="Kliknij, aby rozwinąć"
      >
        {naglowek}
      </tr>
      {otwarty && (
        <tr className="bg-soft/60">
          <td colSpan={5} className="px-6 py-4">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}
