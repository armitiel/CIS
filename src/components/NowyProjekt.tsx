"use client";

// Popup dodawania nowego projektu. Dane można wypełniać z WIELU dokumentów
// po kolei (wniosek, umowa, fiszka naboru — .docx/.txt albo wklejony tekst):
// każdy kolejny dokument DOKŁADA dane do pustych pól, niczego nie nadpisując
// (ani wartości z wcześniejszych dokumentów, ani ręcznych poprawek).
// Każda wartość ma pokazane źródło: plik + fragment tekstu. Dokument
// nierozpoznany jako wniosek nie wypełnia pól.

import { useRef, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import Portal from "@/components/Portal";
import {
  analizujDokument,
  analizujPrzezAI,
  wyciagnijTekstZPliku,
  type Rozpoznanie,
  type WynikAnalizy,
} from "@/lib/analiza-wniosku";
import type { ProjektWlasnyZapis } from "@/lib/projekty";

const STATUS_ANALIZY: Record<
  Rozpoznanie,
  { ikona: string; klasa: string; krotko: string }
> = {
  wniosek: {
    ikona: "check_circle",
    klasa: "bg-green-soft text-primary-strong",
    krotko: "wniosek",
  },
  czesciowe: {
    ikona: "warning",
    klasa: "bg-amber-soft text-amber-ink",
    krotko: "częściowo rozpoznany",
  },
  nierozpoznany: {
    ikona: "error",
    klasa: "bg-red-soft text-red-ink",
    krotko: "nierozpoznany",
  },
};

interface DokumentAnalizy {
  nazwa: string;
  rozpoznanie: Rozpoznanie;
  punkty: number;
}

interface TrafienieZeZrodlem {
  pole: string;
  wartosc: string;
  fragment: string;
  dokument: string;
  zastosowano: boolean;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "projekt"
  );
}

export default function NowyProjekt({ onClose }: { onClose: () => void }) {
  const { dodajProjekt, projekty } = useProjekt();

  const [nazwa, setNazwa] = useState("");
  const [skrot, setSkrot] = useState("");
  const [nabor, setNabor] = useState("");
  const [wnioskodawca, setWnioskodawca] = useState("");
  const [okres, setOkres] = useState("");

  const [dokumenty, setDokumenty] = useState<DokumentAnalizy[]>([]);
  const [trafienia, setTrafienia] = useState<TrafienieZeZrodlem[]>([]);
  const [uwagi, setUwagi] = useState<string[]>([]);
  const [sekcje, setSekcje] = useState<Map<string, string>>(new Map());
  const [blad, setBlad] = useState<string | null>(null);
  const [pokazWklej, setPokazWklej] = useState(false);
  const [wklejony, setWklejony] = useState("");
  const [analizuje, setAnalizuje] = useState(false);
  const [uzytoAI, setUzytoAI] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Analiza tekstu: najpierw AI (endpoint serwerowy), w razie niepowodzenia — lokalnie. */
  async function przeanalizuj(tekst: string, nazwaDok: string) {
    const ai = await analizujPrzezAI(tekst);
    if (ai) {
      setUzytoAI(true);
      dolozAnalize(ai, nazwaDok);
    } else {
      dolozAnalize(analizujDokument(tekst), nazwaDok);
    }
  }

  /**
   * Dokłada wynik analizy kolejnego dokumentu: wypełnia TYLKO puste pola.
   * Konflikt (pole już wypełnione inną wartością) trafia do uwag — bez
   * nadpisywania danych zgromadzonych wcześniej.
   */
  function dolozAnalize(wynik: WynikAnalizy, nazwaDok: string) {
    setBlad(null);
    setDokumenty((d) => [
      ...d,
      { nazwa: nazwaDok, rozpoznanie: wynik.rozpoznanie, punkty: wynik.punkty },
    ]);

    const noweUwagi: string[] = [...wynik.uwagi];
    const stanPol: [string, string, (v: string) => void, string | undefined][] =
      [
        ["Tytuł projektu", nazwa, setNazwa, wynik.pola.nazwa],
        ["Nabór", nabor, setNabor, wynik.pola.nabor],
        ["Wnioskodawca", wnioskodawca, setWnioskodawca, wynik.pola.wnioskodawca],
        ["Okres realizacji", okres, setOkres, wynik.pola.okres],
      ];

    const zastosowanePola = new Set<string>();
    for (const [etykieta, obecna, ustaw, nowa] of stanPol) {
      if (!nowa) continue;
      if (obecna.trim() === "") {
        ustaw(nowa);
        zastosowanePola.add(etykieta);
      } else if (obecna.trim() !== nowa) {
        noweUwagi.push(
          `${etykieta}: w „${nazwaDok}” znaleziono inną wartość („${nowa}”) — pozostawiono dotychczasową. Możesz poprawić ręcznie.`,
        );
      }
    }
    if (wynik.pola.nazwa && skrot.trim() === "" && nazwa.trim() === "") {
      setSkrot(wynik.pola.nazwa.split(/\s+/).slice(0, 3).join(" "));
    }

    setTrafienia((t) => [
      ...t,
      ...wynik.trafienia.map((tr) => ({
        ...tr,
        dokument: nazwaDok,
        zastosowano: zastosowanePola.has(tr.pole),
      })),
    ]);
    setUwagi((u) => [...u, ...noweUwagi]);
    // E6 — kumuluj wykryte sekcje katalogu z kolejnych dokumentów
    setSekcje((m) => {
      const n = new Map(m);
      for (const s of wynik.sugerowaneSekcje)
        if (!n.has(s.sekcja)) n.set(s.sekcja, s.nazwa);
      return n;
    });
  }

  async function analizujPlik(file: File | undefined) {
    if (!file) return;
    setAnalizuje(true);
    setBlad(null);
    try {
      const tekst = await wyciagnijTekstZPliku(file);
      dolozAnalize(analizujDokument(tekst), file.name);
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się odczytać pliku.");
    } finally {
      setAnalizuje(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function analizujWklejony() {
    if (wklejony.trim().length === 0) return;
    dolozAnalize(
      analizujDokument(wklejony),
      `wklejony tekst #${dokumenty.length + 1}`,
    );
    setWklejony("");
    setPokazWklej(false);
  }

  function utworz() {
    const n = nazwa.trim();
    if (!n) return;
    const baza = slug(skrot.trim() || n);
    let id = baza;
    let i = 2;
    while (projekty.some((p) => p.id === id)) id = `${baza}-${i++}`;
    const rozpoznane = dokumenty.filter(
      (d) => d.rozpoznanie !== "nierozpoznany",
    );
    const zapis: ProjektWlasnyZapis = {
      id,
      nazwa: n,
      skrot: skrot.trim() || n.slice(0, 24),
      nabor: nabor.trim(),
      wnioskodawca: wnioskodawca.trim(),
      okres: okres.trim(),
      zrodlo:
        rozpoznane.length > 0
          ? `analiza dokumentów: ${rozpoznane.map((d) => d.nazwa).join(", ")}`
          : "wpis ręczny",
      utworzono: new Date().toISOString().slice(0, 10),
      sekcje: sekcje.size > 0 ? [...sekcje.keys()] : undefined,
    };
    dodajProjekt(zapis);
    onClose();
  }

  const pole =
    "w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-[oklch(0.62_0.09_152)] focus:shadow-[0_0_0_3px_oklch(0.55_0.09_152/0.12)]";
  const etykieta = "mb-1 block text-xs font-semibold text-muted";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
        onClick={onClose}
      >
        <div
          className="anim-pop card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
                Nowy projekt
              </h3>
              <p className="m-0 mt-0.5 text-xs text-muted">
                Dane możesz złożyć z kilku dokumentów (wniosek, umowa, fiszka)
                — kolejne pliki uzupełniają puste pola
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-faint hover:text-ink"
              title="Zamknij"
            >
              <span className="material-symbols-rounded notranslate text-[22px]">
                close
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Źródło danych */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".docx,.txt,.pdf"
                className="hidden"
                onChange={(e) => analizujPlik(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={analizuje}
                className="btn-primary"
              >
                <span className="material-symbols-rounded notranslate text-[19px]">
                  upload_file
                </span>
                {analizuje
                  ? "Analizuję…"
                  : dokumenty.length === 0
                    ? "Wczytaj dokument projektu"
                    : "Dodaj kolejny dokument"}
              </button>
              <button
                onClick={() => setPokazWklej((v) => !v)}
                className="btn-dark"
                title="np. treść wniosku skopiowana z SOWA lub PDF"
              >
                <span className="material-symbols-rounded notranslate text-[18px]">
                  content_paste
                </span>
                Wklej tekst
              </button>
              <span className="text-xs text-faint">
                albo wypełnij pola ręcznie poniżej
              </span>
            </div>

            {/* Lista przeanalizowanych dokumentów — dane się kumulują */}
            {dokumenty.length > 0 && (
              <div className="anim-fade-in mt-3 flex flex-wrap gap-1.5">
                {dokumenty.map((d, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_ANALIZY[d.rozpoznanie].klasa}`}
                    title={`Cechy wniosku: ${d.punkty}/10`}
                  >
                    <span className="material-symbols-rounded notranslate text-[15px]">
                      {STATUS_ANALIZY[d.rozpoznanie].ikona}
                    </span>
                    {d.nazwa} · {STATUS_ANALIZY[d.rozpoznanie].krotko}
                  </span>
                ))}
              </div>
            )}

            {pokazWklej && (
              <div className="anim-fade-in mt-3">
                <textarea
                  value={wklejony}
                  onChange={(e) => setWklejony(e.target.value)}
                  placeholder="Wklej treść wniosku o dofinansowanie (np. skopiowaną z SOWA albo z pliku PDF)…"
                  rows={6}
                  className={`${pole} font-mono text-xs`}
                />
                <button
                  onClick={analizujWklejony}
                  disabled={wklejony.trim().length === 0}
                  className="btn-dark mt-2"
                >
                  Analizuj wklejony tekst
                </button>
              </div>
            )}

            {blad && (
              <div className="anim-fade-in mt-3 flex items-start gap-2 rounded-xl bg-red-soft px-4 py-3 text-sm text-red-ink">
                <span className="material-symbols-rounded notranslate mt-px text-lg">
                  error
                </span>
                {blad}
              </div>
            )}

            {trafienia.length > 0 && (
              <details className="anim-fade-in mt-3 rounded-xl border border-line" open>
                <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-ink hover:bg-hover-row">
                  Zebrane wartości i ich źródła ({trafienia.length})
                </summary>
                <ul className="m-0 flex list-none flex-col gap-1.5 border-t border-line-soft p-3">
                  {trafienia.map((t, i) => (
                    <li key={i} className="text-xs leading-snug">
                      <span className="font-semibold text-ink">{t.pole}:</span>{" "}
                      <span className="text-primary-strong">{t.wartosc}</span>{" "}
                      <span className="text-faint">
                        — {t.dokument}
                        {!t.zastosowano && " (niezastosowane — pole było już wypełnione)"}
                      </span>
                      <div className="mt-0.5 text-faint">{t.fragment}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {sekcje.size > 0 && (
              <div className="anim-fade-in mt-3 rounded-xl border border-line bg-soft/60 px-4 py-3">
                <p className="m-0 text-xs font-semibold text-ink-mid">
                  Z wniosku wynikają sekcje dokumentów (katalog nowego
                  projektu):
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...sekcje.entries()].map(([litera, nazwa]) => (
                    <span
                      key={litera}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-primary-strong"
                    >
                      <span className="material-symbols-rounded notranslate text-[15px]">
                        folder
                      </span>
                      {litera}. {nazwa}
                    </span>
                  ))}
                </div>
                <p className="m-0 mt-2 text-[11px] text-faint">
                  Katalog formularzy zostanie wstępnie złożony z tych sekcji —
                  doprecyzujesz go w module Dokumenty.
                </p>
              </div>
            )}

            {uwagi.map((u, i) => (
              <p key={i} className="m-0 mt-2 text-xs text-amber-ink">
                {u}
              </p>
            ))}

            {/* Formularz — zawsze do weryfikacji/uzupełnienia */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={etykieta}>Nazwa projektu *</label>
                <input
                  value={nazwa}
                  onChange={(e) => setNazwa(e.target.value)}
                  placeholder="np. Centrum Integracji Społecznej w …"
                  className={pole}
                />
              </div>
              <div>
                <label className={etykieta}>Skrót (menu projektu)</label>
                <input
                  value={skrot}
                  onChange={(e) => setSkrot(e.target.value)}
                  placeholder="np. CIS Nowa Sól"
                  className={pole}
                />
              </div>
              <div>
                <label className={etykieta}>Numer naboru</label>
                <input
                  value={nabor}
                  onChange={(e) => setNabor(e.target.value)}
                  placeholder="np. FELB.06.11-IZ.00-0001/26"
                  className={pole}
                />
              </div>
              <div>
                <label className={etykieta}>Wnioskodawca</label>
                <input
                  value={wnioskodawca}
                  onChange={(e) => setWnioskodawca(e.target.value)}
                  placeholder="np. Stowarzyszenie na Rzecz Edukacji „Pomost”"
                  className={pole}
                />
              </div>
              <div>
                <label className={etykieta}>Okres realizacji</label>
                <input
                  value={okres}
                  onChange={(e) => setOkres(e.target.value)}
                  placeholder="np. 01.06.2026 – 31.12.2027"
                  className={pole}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
            <span className="text-xs text-muted">
              Nowy projekt dostaje uniwersalny zestaw dokumentów EFS (A-01,
              deklaracja, RODO, zaświadczenie) — pełny katalog formularzy
              uzupełnisz w module Dokumenty.
            </span>
            <button
              onClick={utworz}
              disabled={nazwa.trim().length === 0}
              className="btn-primary shrink-0"
            >
              <span className="material-symbols-rounded notranslate text-[19px]">
                add_circle
              </span>
              Utwórz projekt
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
