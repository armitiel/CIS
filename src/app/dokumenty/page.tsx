"use client";

import { useRef, useState } from "react";
import { uczestnicy } from "@/lib/mock-data";
import {
  brakiWTeczce,
  specyfikacjaCIS,
  wymaganeDokumenty,
} from "@/lib/projekt-spec";
import { generujDokument, generujPakiet } from "@/lib/generator";

const momentLabel = {
  rekrutacja: "rekrutacja",
  "udział": "w trakcie udziału",
  "zakończenie": "zakończenie",
} as const;

export default function Dokumenty() {
  const [wniosekNazwa, setWniosekNazwa] = useState<string | null>(null);
  const [rozpoznano, setRozpoznano] = useState(false);
  const [rozwiniety, setRozwiniety] = useState<string | null>(null);
  const [generuje, setGeneruje] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function wczytajWniosek(file: File | undefined) {
    if (!file) return;
    setWniosekNazwa(file.name);
    // Symulacja analizy — w etapie E6 plik trafi do analizy AI,
    // która sama zbuduje specyfikację dokumentów dla dowolnego naboru.
    setTimeout(() => setRozpoznano(true), 600);
  }

  async function pobierzDokument(docId: string, uczestnikId: string) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    const d = specyfikacjaCIS.dokumenty.find((x) => x.id === docId);
    if (!u || !d) return;
    setGeneruje(`${uczestnikId}:${docId}`);
    try {
      await generujDokument(d, u);
    } finally {
      setGeneruje(null);
    }
  }

  async function pobierzPakiet(uczestnikId: string, tylkoBraki: boolean) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    if (!u) return;
    const dokumenty = (tylkoBraki ? brakiWTeczce(u) : wymaganeDokumenty(u)).filter(
      (d) => d.generowalny,
    );
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
          Specyfikacja projektu → wymagane formularze → generowanie z bazy
          uczestników
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
              Wczytaj wniosek o dofinansowanie, aby rozpoznać wymagane
              dokumenty
            </p>
          </div>
          <div className="flex items-center gap-3">
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
                ✓ Rozpoznano projekt: {specyfikacjaCIS.nazwa} (
                {specyfikacjaCIS.nabor})
              </p>
            ) : (
              <p className="mt-1 text-slate-500">Analizowanie…</p>
            )}
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600">
            Aktywna specyfikacja: {specyfikacjaCIS.nazwa}
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Dokument</th>
                  <th className="px-4 py-2 font-medium">Dotyczy</th>
                  <th className="px-4 py-2 font-medium">Moment</th>
                  <th className="px-4 py-2 font-medium">Generowanie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specyfikacjaCIS.dokumenty.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-700">{d.nazwa}</p>
                      <p className="text-xs text-slate-400">{d.opis}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {d.dotyczy === "wszyscy"
                        ? "wszyscy"
                        : d.dotyczy === "bezrobotny"
                          ? "bezrobotni (IPZS)"
                          : "bierni zawodowo (IPR)"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {momentLabel[d.moment]}
                    </td>
                    <td className="px-4 py-2">
                      {d.generowalny ? (
                        <span className="text-green-700">z aplikacji</span>
                      ) : (
                        <span className="text-slate-400">
                          dostarcza uczestnik
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Specyfikacja naboru FELB.06.11 jest wbudowana. Automatyczna analiza
            dowolnego wniosku (AI) — etap E6.
          </p>
        </div>
      </section>

      {/* KROK 2: teczki i generowanie */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-700">
          2. Teczki uczestników i generowanie
        </h2>
        <p className="text-sm text-slate-500">
          Silnik reguł wskazuje braki. Kliknij uczestnika, aby zobaczyć
          szczegóły i pobrać dokumenty.
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
                const otwarty = rozwiniety === u.id;
                return (
                  <FragmentRow
                    key={u.id}
                    otwarty={otwarty}
                    onToggle={() => setRozwiniety(otwarty ? null : u.id)}
                    naglowek={
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {u.nazwisko} {u.imie}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {u.kategoria === "bezrobotny" ? "IPZS" : "IPR"} ·{" "}
                            {u.status}
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
                              pobierzPakiet(u.id, true);
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
                              <span className="text-slate-700">{d.nazwa}</span>{" "}
                              <span className="text-xs text-slate-400">
                                ({momentLabel[d.moment]})
                              </span>
                            </span>
                            {d.generowalny ? (
                              <button
                                onClick={() => pobierzDokument(d.id, u.id)}
                                disabled={generuje !== null}
                                className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {generuje === klucz
                                  ? "Generuję…"
                                  : "Pobierz .docx"}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                dostarcza uczestnik
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Dokumenty generowane są z danych testowych. Pola nieobecne w bazie
          (PESEL, adres) pojawiają się jako miejsca do uzupełnienia — znikną po
          etapie E1.
        </p>
      </section>
    </div>
  );
}

function FragmentRow({
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
