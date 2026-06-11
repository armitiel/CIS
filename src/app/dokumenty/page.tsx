"use client";

import { useMemo, useRef, useState } from "react";
import { uczestnicy } from "@/lib/mock-data";
import {
  brakiWTeczce,
  dokumentyAdHoc,
  sekcjeNazwy,
  specyfikacjaCIS,
  wymaganeDokumenty,
  type Sekcja,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import { generujDokument, generujPakiet } from "@/lib/generator";

const rodzajLabel: Record<WymaganyDokument["rodzaj"], string> = {
  uczestnik: "teczka uczestnika",
  grupowy: "lista zbiorcza",
  kadrowy: "dokument kadrowy",
  organizacyjny: "organizacyjny",
};

const rodzajStyl: Record<WymaganyDokument["rodzaj"], string> = {
  uczestnik: "bg-blue-100 text-blue-800",
  grupowy: "bg-violet-100 text-violet-800",
  kadrowy: "bg-slate-200 text-slate-700",
  organizacyjny: "bg-teal-100 text-teal-800",
};

export default function Dokumenty() {
  const [wniosekNazwa, setWniosekNazwa] = useState<string | null>(null);
  const [rozpoznano, setRozpoznano] = useState(false);
  const [rozwiniety, setRozwiniety] = useState<string | null>(null);
  const [generuje, setGeneruje] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sekcje = useMemo(() => {
    const m = new Map<Sekcja, WymaganyDokument[]>();
    for (const d of specyfikacjaCIS.dokumenty) {
      m.set(d.sekcja, [...(m.get(d.sekcja) ?? []), d]);
    }
    return m;
  }, []);

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
      await generujDokument(d, u);
    } finally {
      setGeneruje(null);
    }
  }

  async function pobierzPakiet(uczestnikId: string) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    if (!u) return;
    const dokumenty = brakiWTeczce(u).filter((d) => d.generowalny);
    if (dokumenty.length === 0) return;
    setGeneruje(`${uczestnikId}:pakiet`);
    try {
      await generujPakiet(dokumenty, u);
    } finally {
      setGeneruje(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">
          Generator dokumentacji
        </h1>
        <p className="text-sm text-slate-500">
          Katalog formularzy A–H wg analizy optymalizacji (10.06.2026) —
          silnik reguł i generowanie z bazy uczestników
        </p>
      </header>

      {/* KROK 1: wniosek / specyfikacja */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-700">
              1. Wniosek / specyfikacja projektu
            </h2>
            <p className="text-sm text-slate-500">
              Aktywna specyfikacja: {specyfikacjaCIS.nazwa} (
              {specyfikacjaCIS.nabor})
            </p>
            <p className="text-xs text-slate-400">
              Źródło: {specyfikacjaCIS.zrodlo}
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => wczytajWniosek(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Wczytaj wniosek
            </button>
          </div>
        </div>

        {wniosekNazwa && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="text-slate-600">
              Plik: <span className="font-medium">{wniosekNazwa}</span>
            </p>
            {rozpoznano ? (
              <p className="mt-1 font-medium text-green-700">
                ✓ Rozpoznano projekt: {specyfikacjaCIS.nazwa}
              </p>
            ) : (
              <p className="mt-1 text-slate-500">Analizowanie…</p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {[...sekcje.entries()].map(([sekcja, dokumenty]) => (
            <details key={sekcja} className="group rounded-lg border border-slate-200">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <span>{sekcjeNazwy[sekcja]}</span>
                <span className="text-xs font-normal text-slate-400">
                  {dokumenty.length} formularzy
                </span>
              </summary>
              <table className="w-full border-t border-slate-100 text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {dokumenty.map((d) => (
                    <tr key={d.id}>
                      <td className="w-24 px-4 py-2 align-top font-mono text-xs text-slate-500">
                        {d.symbol}
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-700">{d.nazwa}</p>
                        <p className="text-xs text-slate-400">{d.opis}</p>
                        <p className="text-xs text-slate-400">
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
                          <p className="mt-1 text-xs text-slate-400">
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
        <p className="mt-3 text-xs text-slate-400">
          Specyfikacja wbudowana — automatyczna analiza dowolnego wniosku (AI)
          to etap E6. Pełne odwzorowanie treści wzorów PDF — etap E5.
        </p>
      </section>

      {/* KROK 2: teczki i generowanie */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-700">
          2. Teczki uczestników i generowanie
        </h2>
        <p className="text-sm text-slate-500">
          Silnik reguł pokazuje dokumenty indywidualne wymagane w teczce
          (IPZS — bezrobotni, IPR — bierni, A-05 tylko uczestnicy CIS itd.).
          Kliknij uczestnika, aby pobrać dokumenty .docx.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Uczestnik</th>
                <th className="px-4 py-2 font-medium">Wymagane</th>
                <th className="px-4 py-2 font-medium">W teczce</th>
                <th className="px-4 py-2 font-medium">Braki</th>
                <th className="px-4 py-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uczestnicy.map((u) => {
                const wymagane = wymaganeDokumenty(u);
                const braki = brakiWTeczce(u);
                const adHoc = dokumentyAdHoc(u);
                const otwarty = rozwiniety === u.id;
                return (
                  <Wiersz
                    key={u.id}
                    otwarty={otwarty}
                    onToggle={() => setRozwiniety(otwarty ? null : u.id)}
                    naglowek={
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {u.nazwisko} {u.imie}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {u.sciezka} · {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {wymagane.length}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {wymagane.length - braki.length}
                        </td>
                        <td className="px-4 py-3">
                          {braki.length === 0 ? (
                            <span className="text-sm font-medium text-green-700">
                              komplet ✓
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-amber-700">
                              {braki.length}
                            </span>
                          )}
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
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
                                    wTeczce ? "text-green-700" : "text-amber-700"
                                  }
                                >
                                  {wTeczce ? "✓" : "—"}
                                </span>{" "}
                                <span className="font-mono text-xs text-slate-400">
                                  {d.symbol}
                                </span>{" "}
                                <span className="text-slate-700">{d.nazwa}</span>
                              </span>
                              {d.generowalny ? (
                                <button
                                  onClick={() => pobierzDokument(d, u.id)}
                                  disabled={generuje !== null}
                                  className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {generuje === klucz
                                    ? "Generuję…"
                                    : "Pobierz .docx"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  wystawia OPS/PUP
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {adHoc.length > 0 && (
                        <div className="border-t border-slate-200 pt-2">
                          <p className="text-xs font-medium text-slate-500">
                            Dokumenty „ad hoc” (gdy dotyczy):
                          </p>
                          <ul className="mt-1 space-y-1">
                            {adHoc.map((d) => (
                              <li
                                key={d.id}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span>
                                  <span className="font-mono text-xs text-slate-400">
                                    {d.symbol}
                                  </span>{" "}
                                  <span className="text-slate-600">
                                    {d.nazwa}
                                  </span>
                                </span>
                                <button
                                  onClick={() => pobierzDokument(d, u.id)}
                                  disabled={generuje !== null}
                                  className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Dane testowe (fikcyjne) w strukturze SOWA. Dokumenty grupowe i
          kadrowe (listy obecności, dzienniki, protokoły) będą generowane z
          modułów Obecności i Harmonogram (etapy E2–E4).
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
        className="cursor-pointer hover:bg-blue-50/40"
        title="Kliknij, aby rozwinąć"
      >
        {naglowek}
      </tr>
      {otwarty && (
        <tr className="bg-slate-50/60">
          <td colSpan={5} className="px-6 py-4">
            {children}
          </td>
        </tr>
      )}
    </>
  );
}
