"use client";

// Moduł Dokumenty — perspektywa PROJEKTOWA: specyfikacja i katalog formularzy,
// generowanie zbiorcze (ZIP), akcje dla wybranej osoby oraz szablony własne.
// Pełna teczka pojedynczego uczestnika jest w jego kartotece (moduł Uczestnicy).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import {
  brakiWTeczce,
  sekcjeNazwy,
  wymaganeDokumenty,
  type Sekcja,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import {
  dokumentBlob,
  generujPakiet,
  generujPakietyZbiorczo,
  uczestnikWzor,
} from "@/lib/generator";
import { podgladDocx, type LiniaPodgladu } from "@/lib/podglad-docx";
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
import WyborGeneratora from "@/components/WyborGeneratora";

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
  const [generuje, setGeneruje] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [szablony, setSzablony] = useState<SzablonZapisany[]>([]);
  const [pokazWybor, setPokazWybor] = useState(false);
  const [wybranyId, setWybranyId] = useState("");
  const [podglad, setPodglad] = useState<{
    tytul: string;
    linie: LiniaPodgladu[];
  } | null>(null);
  const [podgladLaduje, setPodgladLaduje] = useState<string | null>(null);
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

  const zBrakami = useMemo(
    () => uczestnicy.filter((u) => brakiWTeczce(u, spec).length > 0).length,
    [uczestnicy, spec],
  );

  const wybrany = uczestnicy.find((u) => u.id === wybranyId);
  const brakiWybranego = wybrany
    ? brakiWTeczce(wybrany, spec).filter((d) => d.generowalny).length
    : 0;

  function wczytajWniosek(file: File | undefined) {
    if (!file) return;
    setWniosekNazwa(file.name);
    setRozpoznano(false);
    setTimeout(() => setRozpoznano(true), 600);
  }

  /** Pakiet braków dla wybranej osoby. */
  async function pobierzPakietWybranego() {
    if (!wybrany) return;
    const dokumenty = brakiWTeczce(wybrany, spec).filter((d) => d.generowalny);
    if (dokumenty.length === 0) return;
    setGeneruje(`${wybrany.id}:pakiet`);
    try {
      await generujPakiet(dokumenty, wybrany, spec);
    } finally {
      setGeneruje(null);
    }
  }

  /** Wsadowo: pakiety dokumentów dla wszystkich uczestników → jeden ZIP. */
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

  /** Podgląd wzoru formularza z listy specyfikacji (uczestnik wzorcowy). */
  async function pokazPodgladWzoru(d: WymaganyDokument) {
    setPodgladLaduje(`wzor:${d.id}`);
    try {
      const blob = await dokumentBlob(d, uczestnikWzor(d.dotyczy), spec);
      setPodglad({
        tytul: `${d.symbol} · ${d.nazwa} — wzór (pola puste)`,
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

  /** Podgląd szablonu własnego — znaczniki {{pole}} pozostają widoczne. */
  async function pokazPodgladSzablonu(s: SzablonZapisany) {
    setPodgladLaduje(`podglad-szablon:${s.nazwa}`);
    try {
      setPodglad({
        tytul: `${s.nazwa} — szablon (znaczniki {{pole}})`,
        linie: await podgladDocx(arrayBufferZBase64(s.base64)),
      });
    } catch (e) {
      setKomunikat(
        `Błąd podglądu: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    } finally {
      setPodgladLaduje(null);
    }
  }

  return (
    <div className="flex max-w-[1240px] flex-col gap-[18px]">
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
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-primary"
            >
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
                      <td className="w-28 px-4 py-2 text-right align-top">
                        <button
                          onClick={() => pokazPodgladWzoru(d)}
                          disabled={podgladLaduje !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50"
                          title="Podgląd wzoru formularza (pola puste)"
                        >
                          <span className="material-symbols-rounded text-[16px]">
                            visibility
                          </span>
                          {podgladLaduje === `wzor:${d.id}` ? "…" : "Podgląd"}
                        </button>
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

      {/* KROK 2: generowanie — zbiorczo i dla wybranej osoby */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              2. Generowanie dokumentów
            </h2>
            <p className="m-0 mt-[5px] text-[13.5px] text-muted">
              Zbiorczo dla całej grupy ({uczestnicy.length} osób, w tym{" "}
              {zBrakami} z brakami) albo dla wybranej osoby.
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
              {generuje === "wsad" ? "Generuję…" : "Pakiety braków (ZIP)"}
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

        {/* Akcje dla wybranej osoby */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-soft/60 px-4 py-3">
          <span className="text-[13px] font-semibold text-ink-mid">
            Dla wybranej osoby:
          </span>
          <select
            value={wybranyId}
            onChange={(e) => setWybranyId(e.target.value)}
            className="w-56 cursor-pointer rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none"
          >
            <option value="">wybierz uczestnika…</option>
            {uczestnicy.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nazwisko} {u.imie}
              </option>
            ))}
          </select>
          <button
            onClick={pobierzPakietWybranego}
            disabled={!wybrany || brakiWybranego === 0 || generuje !== null}
            className="btn-dark"
            title={
              wybrany && brakiWybranego === 0
                ? "Teczka kompletna — brak dokumentów do wygenerowania"
                : "Pakiet brakujących dokumentów (.docx) dla wybranej osoby"
            }
          >
            <span className="material-symbols-rounded text-[18px]">
              download
            </span>
            {generuje === `${wybranyId}:pakiet`
              ? "Generuję…"
              : `Pakiet braków${wybrany ? ` (${brakiWybranego})` : ""}`}
          </button>
          {wybrany && (
            <Link
              href={`/uczestnicy/${wybrany.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-semibold text-primary-strong hover:bg-green-soft"
              title="Pełna teczka: pojedyncze dokumenty, podgląd, szablony"
            >
              <span className="material-symbols-rounded text-[18px]">
                folder_open
              </span>
              Otwórz teczkę
            </Link>
          )}
        </div>

        {komunikat && (
          <div className="anim-fade-in mt-3 rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
            {komunikat}
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
          <span className="material-symbols-rounded text-base text-blue-ink">
            info
          </span>
          Pełna teczka osoby (pojedyncze dokumenty, ad hoc) jest w jej
          kartotece. Dokumenty grupowe i kadrowe (listy obecności, dzienniki,
          protokoły) będą generowane z modułów Obecności i Harmonogram (etapy
          E2–E4).
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
                  <th className="th-label w-20 px-4 py-2" />
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
                        onClick={() => pokazPodgladSzablonu(s)}
                        disabled={podgladLaduje !== null}
                        className="mr-2 text-faint hover:text-ink disabled:opacity-50"
                        title="Podgląd szablonu (ze znacznikami)"
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          visibility
                        </span>
                      </button>
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

      {/* POPUP: podgląd dokumentu / szablonu */}
      {podglad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
      )}

      {/* POPUP: wybór uczestników × dokumentów (wspólny komponent) */}
      {pokazWybor && (
        <WyborGeneratora
          spec={spec}
          uczestnicy={uczestnicy}
          onClose={() => setPokazWybor(false)}
          onDone={(k) => setKomunikat(k)}
        />
      )}
    </div>
  );
}
