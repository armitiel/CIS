"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import {
  brakiWTeczce,
  dokumentyAdHoc,
  sekcjeNazwy,
  wymaganeDokumenty,
  type Sekcja,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import {
  generujDokument,
  generujPakiet,
  generujPakietyZbiorczo,
} from "@/lib/generator";
import {
  LISTA_POL,
  arrayBufferZBase64,
  base64ZArrayBuffer,
  generujZSzablonu,
  generujZSzablonuZbiorczo,
  wczytajSzablony,
  zapiszSzablony,
  type SzablonZapisany,
} from "@/lib/szablony";
import { generujInteraktywnyFormularz } from "@/lib/pdf-interaktywny";
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
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [szablony, setSzablony] = useState<SzablonZapisany[]>([]);
  const [pokazWybor, setPokazWybor] = useState(false);
  const [wybrane, setWybrane] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const szablonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSzablony(wczytajSzablony(projekt.id));
  }, [projekt.id]);

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

  /** Wsadowo: pakiety braków dla wszystkich uczestników → jeden ZIP. */
  async function pobierzPakietyWsadowo(tylkoBraki: boolean) {
    setGeneruje("wsad");
    setKomunikat(null);
    try {
      const pakiety = uczestnicy.map((u) => ({
        uczestnik: u,
        dokumenty: (tylkoBraki
          ? brakiWTeczce(u, spec)
          : wymaganeDokumenty(u, spec)
        ).filter((d) => d.generowalny),
      }));
      const n = await generujPakietyZbiorczo(
        pakiety,
        spec,
        tylkoBraki ? "Pakiety_brakow" : "Pakiety_komplet",
      );
      setKomunikat(
        n > 0
          ? `✓ Wygenerowano ZIP z pakietami dla ${n} uczestników.`
          : "Brak dokumentów do wygenerowania (wszystkie teczki kompletne).",
      );
    } finally {
      setGeneruje(null);
    }
  }

  /** Wsadowo: tylko dokumenty wybrane w popupie, dla wszystkich aktywnych. */
  async function pobierzWybraneWsadowo() {
    setPokazWybor(false);
    setGeneruje("wsad");
    setKomunikat(null);
    try {
      const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
      const pakiety = aktywni.map((u) => ({
        uczestnik: u,
        dokumenty: spec.dokumenty.filter(
          (d) =>
            wybrane.has(d.id) &&
            d.generowalny &&
            (d.dotyczy === "wszyscy" || d.dotyczy === u.kategoria),
        ),
      }));
      const n = await generujPakietyZbiorczo(pakiety, spec, "Pakiety_wybrane");
      setKomunikat(
        n > 0
          ? `✓ Wygenerowano ZIP z wybranymi dokumentami (${wybrane.size} typów) dla ${n} uczestników.`
          : "Żaden z wybranych dokumentów nie pasuje do uczestników (sprawdź kategorie).",
      );
    } finally {
      setGeneruje(null);
    }
  }

  function przelaczWybor(id: string) {
    setWybrane((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /** Dodanie własnego szablonu .docx z polami {{pole}}. */
  async function dodajSzablon(file: File | undefined) {
    if (!file) return;
    const ab = await file.arrayBuffer();
    const nowy: SzablonZapisany = {
      nazwa: file.name,
      base64: base64ZArrayBuffer(ab),
      dodano: new Date().toISOString().slice(0, 10),
    };
    const nowe = [...szablony.filter((s) => s.nazwa !== nowy.nazwa), nowy];
    setSzablony(nowe);
    zapiszSzablony(projekt.id, nowe);
    setKomunikat(`✓ Dodano szablon „${file.name}” do projektu ${projekt.skrot}.`);
    if (szablonRef.current) szablonRef.current.value = "";
  }

  function usunSzablon(nazwa: string) {
    const nowe = szablony.filter((s) => s.nazwa !== nazwa);
    setSzablony(nowe);
    zapiszSzablony(projekt.id, nowe);
  }

  async function generujSzablonZbiorczo(s: SzablonZapisany) {
    setGeneruje(`szablon:${s.nazwa}`);
    setKomunikat(null);
    try {
      const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
      await generujZSzablonuZbiorczo(
        arrayBufferZBase64(s.base64),
        s.nazwa,
        aktywni,
        spec,
      );
      setKomunikat(
        `✓ Wygenerowano „${s.nazwa}” dla ${aktywni.length} aktywnych uczestników (ZIP).`,
      );
    } catch (e) {
      setKomunikat(
        `Błąd szablonu: ${e instanceof Error ? e.message : "sprawdź znaczniki {{pole}}"}`,
      );
    } finally {
      setGeneruje(null);
    }
  }

  function generujSzablonDlaUczestnika(s: SzablonZapisany, uczestnikId: string) {
    const u = uczestnicy.find((x) => x.id === uczestnikId);
    if (!u) return;
    try {
      generujZSzablonu(arrayBufferZBase64(s.base64), s.nazwa, u, spec);
    } catch (e) {
      setKomunikat(
        `Błąd szablonu: ${e instanceof Error ? e.message : "sprawdź znaczniki {{pole}}"}`,
      );
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
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-primary"
              >
                <span className="material-symbols-rounded text-[19px]">
                  upload_file
                </span>
                Wczytaj wniosek
              </button>
              <button
                onClick={async () => {
                  setGeneruje("pdf-int");
                  try {
                    await generujInteraktywnyFormularz(spec);
                    setKomunikat(
                      "✓ Pobrano interaktywny PDF — pola tekstowe i listy rozwijane wypełnisz w Adobe Reader/przeglądarce.",
                    );
                  } catch (e) {
                    setKomunikat(
                      `Błąd PDF: ${e instanceof Error ? e.message : "nieznany"}`,
                    );
                  } finally {
                    setGeneruje(null);
                  }
                }}
                disabled={generuje !== null}
                className="btn-dark"
                title="Wypełnialny PDF: pola tekstowe, listy rozwijane ze słowników SOWA, pola wyboru"
              >
                <span className="material-symbols-rounded text-[18px]">
                  picture_as_pdf
                </span>
                {generuje === "pdf-int"
                  ? "Generuję…"
                  : "Formularz interaktywny (PDF)"}
              </button>
            </div>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              2. Teczki uczestników i generowanie
            </h2>
            <p className="m-0 mt-[5px] text-[13.5px] text-muted">
              Silnik reguł wskazuje braki. Kliknij uczestnika, aby pobrać
              komplet dokumentów .docx.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => pobierzPakietyWsadowo(true)}
              disabled={generuje !== null || uczestnicy.length === 0}
              className="btn-primary"
              title="Jeden ZIP: pakiet brakujących dokumentów dla każdego uczestnika"
            >
              <span className="material-symbols-rounded text-[19px]">
                folder_zip
              </span>
              {generuje === "wsad"
                ? "Generuję…"
                : "Pakiety dla wszystkich (ZIP)"}
            </button>
            <button
              onClick={() => pobierzPakietyWsadowo(false)}
              disabled={generuje !== null || uczestnicy.length === 0}
              className="btn-dark"
              title="Jeden ZIP: komplet wymaganych dokumentów dla każdego uczestnika"
            >
              Komplety (ZIP)
            </button>
            <button
              onClick={() => setPokazWybor(true)}
              disabled={generuje !== null || uczestnicy.length === 0}
              className="btn-dark"
              title="Wybierz z listy, które dokumenty wygenerować dla wszystkich"
            >
              <span className="material-symbols-rounded text-[18px]">
                checklist
              </span>
              Wybierz dokumenty…
            </button>
          </div>
        </div>

        {komunikat && (
          <div className="anim-fade-in mt-3 rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
            {komunikat}
          </div>
        )}

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

      {/* KROK 3: szablony własne z polami dynamicznymi */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              3. Szablony własne (pola dynamiczne)
            </h2>
            <p className="m-0 mt-[5px] text-[13.5px] text-muted">
              Wgraj własny wzór .docx ze znacznikami{" "}
              <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs">
                {"{{imie_nazwisko}}"}
              </code>{" "}
              — aplikacja wypełni go danymi każdego uczestnika.
            </p>
          </div>
          <div>
            <input
              ref={szablonRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => dodajSzablon(e.target.files?.[0])}
            />
            <button
              onClick={() => szablonRef.current?.click()}
              className="btn-primary"
            >
              <span className="material-symbols-rounded text-[19px]">
                note_add
              </span>
              Dodaj szablon .docx
            </button>
          </div>
        </div>

        {szablony.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft">
                <tr>
                  <th className="th-label px-4 py-2">Szablon</th>
                  <th className="th-label px-4 py-2">Dodano</th>
                  <th className="th-label px-4 py-2">Generuj dla…</th>
                  <th className="th-label w-44 px-4 py-2">Wsadowo</th>
                  <th className="th-label w-16 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {szablony.map((s) => (
                  <tr key={s.nazwa}>
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {s.nazwa}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{s.dodano}</td>
                    <td className="px-4 py-2.5">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value)
                            generujSzablonDlaUczestnika(s, e.target.value);
                          e.target.value = "";
                        }}
                        className="w-48 cursor-pointer rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink outline-none"
                      >
                        <option value="" disabled>
                          wybierz uczestnika…
                        </option>
                        {uczestnicy.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nazwisko} {u.imie}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => generujSzablonZbiorczo(s)}
                        disabled={generuje !== null}
                        className="btn-dark"
                      >
                        {generuje === `szablon:${s.nazwa}`
                          ? "Generuję…"
                          : "Wszyscy aktywni (ZIP)"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => usunSzablon(s.nazwa)}
                        className="text-faint hover:text-red-ink"
                        title="Usuń szablon"
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="mt-4 rounded-xl border border-line">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-ink hover:bg-hover-row">
            Dostępne pola dynamiczne ({LISTA_POL.length})
          </summary>
          <div className="grid grid-cols-1 gap-x-6 border-t border-line-soft px-4 py-3 sm:grid-cols-2">
            {LISTA_POL.map(([klucz, opis]) => (
              <div
                key={klucz}
                className="flex items-baseline justify-between gap-3 py-1 text-sm"
              >
                <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs text-ink">
                  {`{{${klucz}}}`}
                </code>
                <span className="text-right text-xs text-muted">{opis}</span>
              </div>
            ))}
          </div>
        </details>

        <p className="mt-3 text-xs text-faint">
          Szablony zapisują się w przeglądarce, osobno dla każdego projektu.
          Brakujące dane uczestnika są wstawiane jako kropki do ręcznego
          uzupełnienia. Wzór: w Wordzie wpisz znacznik w miejscu danych, np.
          „Zaświadcza się, że {"{{imie_nazwisko}}"}, PESEL {"{{pesel}}"}…”.
        </p>
      </section>

      {/* POPUP: wybór dokumentów do generowania wsadowego */}
      {pokazWybor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
          onClick={() => setPokazWybor(false)}
        >
          <div
            className="anim-pop card flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
                  Wybierz dokumenty do wygenerowania
                </h3>
                <p className="m-0 mt-0.5 text-xs text-muted">
                  Dla wszystkich aktywnych uczestników — z poszanowaniem reguł
                  (np. IPZS trafi tylko do bezrobotnych)
                </p>
              </div>
              <button
                onClick={() => setPokazWybor(false)}
                className="text-faint hover:text-ink"
                title="Zamknij"
              >
                <span className="material-symbols-rounded text-[22px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {[...sekcje.entries()].map(([sekcja, dokumenty]) => {
                const generowalne = dokumenty.filter((d) => d.generowalny);
                if (generowalne.length === 0) return null;
                return (
                  <div key={sekcja} className="mb-4">
                    <div className="th-label mb-1.5">{sekcjeNazwy[sekcja]}</div>
                    <div className="space-y-1">
                      {generowalne.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-hover-row"
                        >
                          <input
                            type="checkbox"
                            checked={wybrane.has(d.id)}
                            onChange={() => przelaczWybor(d.id)}
                            className="mt-0.5 h-4 w-4 accent-[oklch(0.52_0.09_152)]"
                          />
                          <span className="text-sm">
                            <span className="font-mono text-xs text-faint">
                              {d.symbol}
                            </span>{" "}
                            <span className="font-medium text-ink">
                              {d.nazwa}
                            </span>
                            {d.dotyczy !== "wszyscy" && (
                              <span className="ml-1.5 text-xs text-muted">
                                (
                                {d.dotyczy === "bezrobotny"
                                  ? "tylko bezrobotni"
                                  : "tylko bierni zawodowo"}
                                )
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() =>
                    setWybrane(
                      new Set(
                        spec.dokumenty
                          .filter(
                            (d) => d.generowalny && d.rodzaj === "uczestnik",
                          )
                          .map((d) => d.id),
                      ),
                    )
                  }
                  className="font-semibold text-primary-strong hover:underline"
                >
                  Teczka uczestnika
                </button>
                <span className="text-faint">·</span>
                <button
                  onClick={() => setWybrane(new Set())}
                  className="font-semibold text-muted hover:underline"
                >
                  Wyczyść
                </button>
              </div>
              <button
                onClick={pobierzWybraneWsadowo}
                disabled={wybrane.size === 0}
                className="btn-primary"
              >
                <span className="material-symbols-rounded text-[19px]">
                  folder_zip
                </span>
                Generuj ZIP ({wybrane.size})
              </button>
            </div>
          </div>
        </div>
      )}
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
