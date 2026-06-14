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
import PodgladDocxModal from "@/components/PodgladDocxModal";
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
import {
  analizujDokument,
  wyciagnijTekstZPliku,
} from "@/lib/analiza-wniosku";
import WyborGeneratora from "@/components/WyborGeneratora";
import WyborUczestnikow from "@/components/WyborUczestnikow";
import Portal from "@/components/Portal";
import { Avatar, BrakiPill } from "@/components/ui";
import type { Uczestnik } from "@/lib/types";

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
  const { projekt, uczestnicy, projektWlasny, aktualizujProjekt } =
    useProjekt();
  const spec = projekt.spec;

  const [wniosekStatus, setWniosekStatus] = useState<{
    typ: "zgodny" | "obcy" | "nierozpoznany" | "blad";
    tekst: string;
    szczegoly: string[];
  } | null>(null);
  const [analizujeWniosek, setAnalizujeWniosek] = useState(false);
  const [generuje, setGeneruje] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [szablony, setSzablony] = useState<SzablonZapisany[]>([]);
  const [pokazWybor, setPokazWybor] = useState(false);
  const [zaznaczeni, setZaznaczeni] = useState<Set<string>>(new Set());
  const [podglad, setPodglad] = useState<{
    tytul: string;
    blob: Blob;
  } | null>(null);
  const [podgladLaduje, setPodgladLaduje] = useState<string | null>(null);
  const [skopiowany, setSkopiowany] = useState<string | null>(null);
  const [wyborSzablonu, setWyborSzablonu] = useState<SzablonZapisany | null>(
    null,
  );
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

  /** Normalizacja numeru naboru do porównań (bez spacji i dopisków typu „(ZIT)”). */
  const normNabor = (s: string) =>
    s.toUpperCase().replace(/\(.*?\)/g, "").replace(/[^A-Z0-9./-]/g, "");

  /**
   * Odświeżenie danych z wniosku: analizuje plik i sprawdza, czy to wniosek
   * TEGO projektu (numer naboru / tytuł). Zgodny → odświeża dane (projekty
   * własne); obcy → ostrzeżenie z podpowiedzią „Nowy projekt…”.
   */
  async function wczytajWniosek(file: File | undefined) {
    if (!file) return;
    setAnalizujeWniosek(true);
    setWniosekStatus(null);
    try {
      const tekst = await wyciagnijTekstZPliku(file);
      const wynik = analizujDokument(tekst);

      if (wynik.rozpoznanie === "nierozpoznany") {
        setWniosekStatus({
          typ: "nierozpoznany",
          tekst: `„${file.name}” nie wygląda na wniosek o dofinansowanie — dane projektu pozostały bez zmian.`,
          szczegoly: [],
        });
        return;
      }

      const naborWniosku = wynik.pola.nabor ?? "";
      const naborProjektu = normNabor(projekt.nabor);
      const zgodnyNabor =
        naborWniosku !== "" &&
        naborProjektu !== "" &&
        (naborProjektu.includes(normNabor(naborWniosku)) ||
          normNabor(naborWniosku).includes(naborProjektu));
      const tytulWniosku = (wynik.pola.nazwa ?? "").toLowerCase();
      const tytulProjektu = projekt.nazwa.toLowerCase();
      const zgodnyTytul =
        tytulWniosku.length > 10 &&
        (tytulProjektu.includes(tytulWniosku.slice(0, 25)) ||
          tytulWniosku.includes(tytulProjektu.slice(0, 25)));

      if (zgodnyNabor || zgodnyTytul) {
        const szczegoly: string[] = [];
        if (projektWlasny) {
          const zmiany: Record<string, string> = {};
          if (wynik.pola.nazwa) zmiany.nazwa = wynik.pola.nazwa;
          if (wynik.pola.nabor) zmiany.nabor = wynik.pola.nabor;
          if (wynik.pola.wnioskodawca)
            zmiany.wnioskodawca = wynik.pola.wnioskodawca;
          if (wynik.pola.okres) zmiany.okres = wynik.pola.okres;
          zmiany.zrodlo = `odświeżono z wniosku: ${file.name}`;
          aktualizujProjekt(projekt.id, zmiany);
          for (const t of wynik.trafienia)
            szczegoly.push(`${t.pole}: ${t.wartosc}`);
          setWniosekStatus({
            typ: "zgodny",
            tekst: `✓ Wniosek zgodny z projektem (${zgodnyNabor ? "numer naboru" : "tytuł"}) — dane projektu odświeżone z „${file.name}”.`,
            szczegoly,
          });
        } else {
          setWniosekStatus({
            typ: "zgodny",
            tekst: `✓ Wniosek zgodny z projektem „${projekt.skrot}” (${zgodnyNabor ? "numer naboru" : "tytuł"}). Dane projektu wbudowanego są stałe — nic nie zmieniono.`,
            szczegoly: wynik.trafienia.map((t) => `${t.pole}: ${t.wartosc}`),
          });
        }
      } else {
        setWniosekStatus({
          typ: "obcy",
          tekst: `„${file.name}” to wniosek INNEGO projektu — dane nie zostały zmienione.`,
          szczegoly: [
            ...(wynik.pola.nabor
              ? [`Nabór we wniosku: ${wynik.pola.nabor} · w projekcie: ${projekt.nabor}`]
              : []),
            ...(wynik.pola.nazwa
              ? [`Tytuł we wniosku: ${wynik.pola.nazwa}`]
              : []),
            "Aby założyć projekt z tego wniosku, użyj „Nowy projekt…” w menu projektów (lewy panel).",
          ],
        });
      }
    } catch (e) {
      setWniosekStatus({
        typ: "blad",
        tekst: e instanceof Error ? e.message : "Nie udało się odczytać pliku.",
        szczegoly: [],
      });
    } finally {
      setAnalizujeWniosek(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Kopiuje znacznik {{pole}} do schowka z krótkim potwierdzeniem. */
  function kopiujZnacznik(tekst: string, klucz: string) {
    navigator.clipboard?.writeText(tekst);
    setSkopiowany(klucz);
    setTimeout(
      () => setSkopiowany((k) => (k === klucz ? null : k)),
      1200,
    );
  }

  function przelaczZaznaczenie(id: string) {
    setZaznaczeni((stan) => {
      const n = new Set(stan);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // zmiana projektu / importu bazy → domyślnie zaznacz wszystkich
  useEffect(() => {
    setZaznaczeni(new Set(uczestnicy.map((u) => u.id)));
  }, [uczestnicy]);

  /**
   * Pakiety dokumentów dla ZAZNACZONYCH osób:
   * jedna osoba → pojedynczy plik .docx, kilka osób → wspólny ZIP.
   */
  async function pakietyDlaZaznaczonych(tylkoBraki: boolean) {
    const wybrani = uczestnicy.filter((u) => zaznaczeni.has(u.id));
    if (wybrani.length === 0) return;
    setGeneruje("wsad");
    setKomunikat(null);
    try {
      const dokDla = (u: Uczestnik) =>
        (tylkoBraki ? brakiWTeczce(u, spec) : wymaganeDokumenty(u, spec)).filter(
          (d) => d.generowalny,
        );
      if (wybrani.length === 1) {
        const u = wybrani[0];
        const dokumenty = dokDla(u);
        if (dokumenty.length === 0) {
          setKomunikat(
            `Teczka ${u.nazwisko} ${u.imie} jest kompletna — brak dokumentów do wygenerowania.`,
          );
          return;
        }
        await generujPakiet(dokumenty, u, spec);
        setKomunikat(
          `✓ Wygenerowano ${tylkoBraki ? "pakiet braków" : "komplet"} (.docx) dla: ${u.nazwisko} ${u.imie}.`,
        );
      } else {
        const pakiety = wybrani.map((u) => ({
          uczestnik: u,
          dokumenty: dokDla(u),
        }));
        const n = await generujPakietyZbiorczo(
          pakiety,
          spec,
          tylkoBraki ? "Pakiety_brakow" : "Pakiety_komplet",
        );
        setKomunikat(
          n > 0
            ? `✓ Wygenerowano ZIP z pakietami dla ${n} z ${wybrani.length} zaznaczonych osób.`
            : "Zaznaczone teczki są kompletne — brak dokumentów do wygenerowania.",
        );
      }
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

  /** Generowanie z szablonu dla wybranych uczestników: 1 → .docx, kilku → ZIP. */
  async function generujSzablonDlaWybranych(
    s: SzablonZapisany,
    wybrani: Uczestnik[],
  ) {
    if (wybrani.length === 0) return;
    setGeneruje(`szablon:${s.nazwa}`);
    setKomunikat(null);
    try {
      if (wybrani.length === 1) {
        generujZSzablonu(
          arrayBufferZBase64(s.base64),
          s.nazwa,
          wybrani[0],
          spec,
        );
        setKomunikat(
          `✓ Wygenerowano „${s.nazwa}” dla: ${wybrani[0].nazwisko} ${wybrani[0].imie}.`,
        );
      } else {
        await generujZSzablonuZbiorczo(
          arrayBufferZBase64(s.base64),
          s.nazwa,
          wybrani,
          spec,
        );
        setKomunikat(
          `✓ Wygenerowano „${s.nazwa}” dla ${wybrani.length} wybranych uczestników (ZIP).`,
        );
      }
    } catch (e) {
      setKomunikat(
        `Błąd szablonu: ${e instanceof Error ? e.message : "sprawdź znaczniki {{pole}}"}`,
      );
    } finally {
      setGeneruje(null);
    }
  }

  /** Podgląd wzoru formularza z listy specyfikacji (uczestnik wzorcowy). */
  async function pokazPodgladWzoru(d: WymaganyDokument) {
    setPodgladLaduje(`wzor:${d.id}`);
    try {
      const blob = await dokumentBlob(d, uczestnikWzor(d.dotyczy), spec);
      setPodglad({
        tytul: `${d.symbol} · ${d.nazwa} — wzór (pola puste)`,
        blob,
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
  function pokazPodgladSzablonu(s: SzablonZapisany) {
    setPodglad({
      tytul: `${s.nazwa} — szablon (znaczniki {{pole}})`,
      blob: new Blob([arrayBufferZBase64(s.base64)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    });
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
              Katalog formularzy pochodzi ze specyfikacji projektu. Wgranie
              wniosku weryfikuje zgodność i odświeża dane projektu
              (automatyczne wyznaczanie katalogu z treści wniosku — etap E6).
            </p>
            <div className="mt-[13px] inline-flex items-center gap-[7px] rounded-[10px] bg-green-soft px-[13px] py-[7px] text-[13px] font-semibold text-primary-strong">
              <span className="material-symbols-rounded notranslate text-lg">
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
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => wczytajWniosek(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={analizujeWniosek}
              className="btn-primary"
              title="Wgraj wniosek TEGO projektu (.pdf/.docx/.txt) — zgodność sprawdzana po numerze naboru i tytule"
            >
              <span className="material-symbols-rounded notranslate text-[19px]">
                sync
              </span>
              {analizujeWniosek ? "Analizuję…" : "Odśwież dane z wniosku"}
            </button>
          </div>
        </div>

        {wniosekStatus && (
          <div
            className={`anim-fade-in mt-4 rounded-xl px-4 py-3 text-sm ${
              wniosekStatus.typ === "zgodny"
                ? "bg-green-soft text-primary-strong"
                : wniosekStatus.typ === "obcy"
                  ? "bg-amber-soft text-amber-ink"
                  : "bg-red-soft text-red-ink"
            }`}
          >
            <p className="m-0 font-semibold">{wniosekStatus.tekst}</p>
            {wniosekStatus.szczegoly.length > 0 && (
              <ul className="m-0 mt-1.5 list-none p-0 text-xs">
                {wniosekStatus.szczegoly.map((s, i) => (
                  <li key={i} className="mt-0.5">
                    {s}
                  </li>
                ))}
              </ul>
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
              <div className="border-t border-line-soft text-sm">
                <div className="divide-y divide-line-soft">
                  {dokumenty.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-3"
                    >
                      <div className="font-mono text-xs text-muted sm:w-20 sm:shrink-0 sm:pt-0.5">
                        {d.symbol}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{d.nazwa}</p>
                        <p className="text-xs text-faint">{d.opis}</p>
                        <p className="text-xs text-faint">
                          Podpisy: {d.podpisUczestnika}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:w-36 sm:shrink-0 sm:flex-col sm:items-start">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rodzajStyl[d.rodzaj]}`}
                        >
                          {rodzajLabel[d.rodzaj]}
                        </span>
                        {d.dotyczy !== "wszyscy" && (
                          <span className="text-xs text-faint">
                            {d.dotyczy === "bezrobotny"
                              ? "bezrobotni (CIS)"
                              : "bierni zawodowo"}
                          </span>
                        )}
                      </div>
                      <div className="sm:shrink-0">
                        <button
                          onClick={() => pokazPodgladWzoru(d)}
                          disabled={podgladLaduje !== null}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50 sm:w-auto sm:py-1"
                          title="Podgląd wzoru formularza (pola puste)"
                        >
                          <span className="material-symbols-rounded notranslate text-[16px]">
                            visibility
                          </span>
                          {podgladLaduje === `wzor:${d.id}` ? "…" : "Podgląd"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Specyfikacja wbudowana — automatyczna analiza dowolnego wniosku (AI)
          to etap E6. Pełne odwzorowanie treści wzorów PDF — etap E5.
        </p>
      </section>

      {/* KROK 2: generowanie — lista osób z zaznaczaniem + akcje na zaznaczeniu */}
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
              Zaznacz osoby na liście ({uczestnicy.length} w bazie, {zBrakami}{" "}
              z brakami) — akcje obejmą zaznaczonych. Jedna osoba → pliki
              .docx, kilka → wspólny ZIP.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => pakietyDlaZaznaczonych(true)}
              disabled={generuje !== null || zaznaczeni.size === 0}
              className="btn-primary"
              title="Brakujące dokumenty z teczek zaznaczonych osób"
            >
              <span className="material-symbols-rounded notranslate text-[19px]">
                folder_zip
              </span>
              {generuje === "wsad"
                ? "Generuję…"
                : `Pakiety braków (${zaznaczeni.size})`}
            </button>
            <button
              onClick={() => pakietyDlaZaznaczonych(false)}
              disabled={generuje !== null || zaznaczeni.size === 0}
              className="btn-dark"
              title="Komplet wymaganych dokumentów dla zaznaczonych osób"
            >
              Komplety ({zaznaczeni.size})
            </button>
            <button
              onClick={() => setPokazWybor(true)}
              disabled={generuje !== null || zaznaczeni.size === 0}
              className="btn-dark"
              title="Wskaż konkretne formularze do wygenerowania dla zaznaczonych osób"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                checklist
              </span>
              Wybierz dokumenty…
            </button>
          </div>
        </div>

        {/* Wbudowana lista uczestników z zaznaczaniem */}
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-soft px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={
                  zaznaczeni.size === uczestnicy.length &&
                  uczestnicy.length > 0
                }
                onChange={(e) =>
                  setZaznaczeni(
                    e.target.checked
                      ? new Set(uczestnicy.map((u) => u.id))
                      : new Set(),
                  )
                }
                className="h-4 w-4 accent-[oklch(0.52_0.09_152)]"
              />
              <span className="th-label">
                Zaznaczono {zaznaczeni.size} z {uczestnicy.length}
              </span>
            </label>
            <span className="flex gap-2.5 text-xs font-semibold">
              <button
                onClick={() =>
                  setZaznaczeni(new Set(uczestnicy.map((u) => u.id)))
                }
                className="text-primary-strong hover:underline"
              >
                wszyscy
              </button>
              <button
                onClick={() =>
                  setZaznaczeni(
                    new Set(
                      uczestnicy
                        .filter((u) => u.status === "aktywny")
                        .map((u) => u.id),
                    ),
                  )
                }
                className="text-primary-strong hover:underline"
              >
                aktywni
              </button>
              <button
                onClick={() =>
                  setZaznaczeni(
                    new Set(
                      uczestnicy
                        .filter((u) => brakiWTeczce(u, spec).length > 0)
                        .map((u) => u.id),
                    ),
                  )
                }
                className="text-amber-ink hover:underline"
              >
                z brakami
              </button>
              <button
                onClick={() => setZaznaczeni(new Set())}
                className="text-muted hover:underline"
              >
                wyczyść
              </button>
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {uczestnicy.map((u) => {
              const braki = brakiWTeczce(u, spec).length;
              return (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 border-t border-line-soft px-4 py-2 transition-colors hover:bg-hover-row"
                >
                  <input
                    type="checkbox"
                    checked={zaznaczeni.has(u.id)}
                    onChange={() => przelaczZaznaczenie(u.id)}
                    className="h-4 w-4 shrink-0 accent-[oklch(0.52_0.09_152)]"
                  />
                  <Avatar nazwa={`${u.imie} ${u.nazwisko}`} size={30} />
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">
                    {u.nazwisko} {u.imie}
                  </span>
                  <span className="text-xs text-faint">
                    {u.sciezka} · {u.status}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <BrakiPill braki={braki} />
                    <Link
                      href={`/uczestnicy/${u.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-strong hover:bg-green-soft"
                      title="Otwórz kartotekę (pełna teczka)"
                    >
                      <span className="material-symbols-rounded notranslate text-lg">
                        folder_open
                      </span>
                    </Link>
                  </span>
                </label>
              );
            })}
            {uczestnicy.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-faint">
                Brak uczestników — zaimportuj bazę w module Uczestnicy.
              </div>
            )}
          </div>
        </div>

        {komunikat && (
          <div className="anim-fade-in mt-3 rounded-xl bg-soft px-4 py-2.5 text-sm text-ink">
            {komunikat}
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
          <span className="material-symbols-rounded notranslate text-base text-blue-ink">
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
              <span className="material-symbols-rounded notranslate text-[19px]">
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
                      <button
                        onClick={() => setWyborSzablonu(s)}
                        disabled={generuje !== null || uczestnicy.length === 0}
                        className="btn-dark"
                        title="Wybierz z listy jednego lub kilku uczestników (widok jak w zakładce Uczestnicy)"
                      >
                        <span className="material-symbols-rounded notranslate text-[18px]">
                          group_add
                        </span>
                        Wybierz uczestników…
                      </button>
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
                        <span className="material-symbols-rounded notranslate text-[20px]">
                          visibility
                        </span>
                      </button>
                      <button
                        onClick={() => usunSzablon(s.nazwa)}
                        className="text-faint hover:text-red-ink"
                        title="Usuń szablon"
                      >
                        <span className="material-symbols-rounded notranslate text-[20px]">
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
                className="flex items-center justify-between gap-3 py-1 text-sm"
              >
                <span className="flex items-center gap-1">
                  <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs text-ink">
                    {`{{${klucz}}}`}
                  </code>
                  <button
                    onClick={() => kopiujZnacznik(`{{${klucz}}}`, klucz)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                      skopiowany === klucz
                        ? "text-primary-strong"
                        : "text-faint hover:bg-soft hover:text-ink"
                    }`}
                    title="Kopiuj znacznik do schowka"
                  >
                    <span className="material-symbols-rounded notranslate text-[16px]">
                      {skopiowany === klucz ? "check" : "content_copy"}
                    </span>
                  </button>
                </span>
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

      {/* POPUP: wybór uczestników do generowania z szablonu własnego */}
      {wyborSzablonu && (
        <WyborUczestnikow
          uczestnicy={uczestnicy}
          spec={spec}
          tytul={`Generowanie z szablonu: ${wyborSzablonu.nazwa}`}
          podtytul="Zaznacz jednego lub kilku uczestników — jeden plik .docx albo wspólny ZIP"
          etykieta="Generuj"
          onClose={() => setWyborSzablonu(null)}
          onConfirm={(wybrani) => {
            const s = wyborSzablonu;
            setWyborSzablonu(null);
            if (s) void generujSzablonDlaWybranych(s, wybrani);
          }}
        />
      )}

      {/* POPUP: podgląd dokumentu / szablonu — wierny render pliku .docx */}
      {podglad && (
        <Portal>
          <PodgladDocxModal
            tytul={podglad.tytul}
            blob={podglad.blob}
            onClose={() => setPodglad(null)}
          />
        </Portal>
      )}

      {/* POPUP: wybór dokumentów dla osób zaznaczonych na liście sekcji 2 */}
      {pokazWybor && (
        <WyborGeneratora
          spec={spec}
          uczestnicy={uczestnicy}
          domyslniUczestnicy={[...zaznaczeni]}
          ukryjUczestnikow
          onClose={() => setPokazWybor(false)}
          onDone={(k) => setKomunikat(k)}
        />
      )}
    </div>
  );
}
