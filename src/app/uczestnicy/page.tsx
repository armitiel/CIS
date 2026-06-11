"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { brakiWTeczce } from "@/lib/projekt-spec";
import { useProjekt } from "@/components/ProjektProvider";
import { etapyNazwy } from "@/lib/mock-data";
import { Avatar, BrakiPill, Pasek, SciezkaPill, StatusPill } from "@/components/ui";
import { walidujBaze, type WynikWalidacji } from "@/lib/sowa-walidacja";
import { eksportujCSV, pobierzCSV } from "@/lib/sowa-eksport";
import WyborGeneratora from "@/components/WyborGeneratora";
import FormularzUczestnika from "@/components/FormularzUczestnika";
import type { KategoriaUczestnika } from "@/lib/types";

type FiltrKategorii = "wszyscy" | KategoriaUczestnika;

export default function Uczestnicy() {
  const {
    projekt,
    uczestnicy,
    zaimportowano,
    importuj,
    wyczyscImport,
    dodajUczestnika,
  } = useProjekt();
  const [szukaj, setSzukaj] = useState("");
  const [kategoria, setKategoria] = useState<FiltrKategorii>("wszyscy");
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [trwaImport, setTrwaImport] = useState(false);
  const [walidacja, setWalidacja] = useState<WynikWalidacji | null>(null);
  const [zaznaczeni, setZaznaczeni] = useState<Set<string>>(new Set());
  const [pokazGenerator, setPokazGenerator] = useState(false);
  const [pokazFormularz, setPokazFormularz] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function przelaczZaznaczenie(id: string) {
    setZaznaczeni((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function waliduj() {
    setWalidacja(walidujBaze(uczestnicy));
  }

  function eksportuj() {
    const csv = eksportujCSV(uczestnicy, { numerProjektu: projekt.nabor });
    pobierzCSV(
      `Import_${projekt.skrot.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
    setKomunikat(
      `Wygenerowano plik Import (${uczestnicy.length} uczestników). ` +
        "Pola „Zakres wsparcia” / „Rodzaj wsparcia” uzupełnij wartościami słownikowymi z eksportu systemowego naboru.",
    );
  }

  // zapytanie z wyszukiwarki w nagłówku (/uczestnicy?q=…)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSzukaj(q);
  }, []);

  const widoczni = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    return uczestnicy.filter((u) => {
      if (kategoria !== "wszyscy" && u.kategoria !== kategoria) return false;
      if (q && !`${u.imie} ${u.nazwisko}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [uczestnicy, szukaj, kategoria]);

  const nIPZS = uczestnicy.filter((u) => u.kategoria === "bezrobotny").length;
  const nIPR = uczestnicy.filter((u) => u.kategoria === "bierny").length;

  async function obsluzImport(file: File | undefined) {
    if (!file) return;
    setTrwaImport(true);
    setKomunikat(null);
    try {
      const wynik = await importuj(file);
      if (wynik.uczestnicy.length > 0) {
        setKomunikat(
          `✓ Zaimportowano ${wynik.uczestnicy.length} uczestników z pliku „${file.name}”.` +
            (wynik.uwagi.length ? ` ${wynik.uwagi.join(" ")}` : ""),
        );
      } else {
        setKomunikat(
          `Nie udało się rozpoznać uczestników w pliku „${file.name}”. ${wynik.uwagi.join(" ")}`,
        );
      }
    } catch (e) {
      setKomunikat(
        `Błąd odczytu pliku: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    } finally {
      setTrwaImport(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const chipy: [FiltrKategorii, string, number][] = [
    ["wszyscy", "Wszyscy", uczestnicy.length],
    ["bezrobotny", "IPZS", nIPZS],
    ["bierny", "IPR", nIPR],
  ];

  return (
    <div className="flex max-w-[1240px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {chipy.map(([wart, label, n]) => (
            <button
              key={wart}
              onClick={() => setKategoria(wart)}
              className={`cursor-pointer rounded-[10px] px-[15px] py-2 text-[13.5px] font-semibold transition-colors ${
                kategoria === wart
                  ? "bg-primary text-white"
                  : "border border-line-strong bg-surface text-ink-mid hover:bg-soft"
              }`}
            >
              {label} · {n}
            </button>
          ))}
          {zaimportowano && (
            <span className="ml-1 rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-primary-strong">
              baza z importu
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => obsluzImport(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={trwaImport}
            className="btn-primary"
          >
            <span className="material-symbols-rounded text-[19px]">
              upload_file
            </span>
            {trwaImport ? "Importuję…" : "Importuj bazę (Excel/CSV)"}
          </button>
          {zaimportowano && (
            <button
              onClick={() => {
                wyczyscImport();
                setKomunikat("Przywrócono dane domyślne projektu.");
              }}
              className="btn-dark"
              title="Usuń zaimportowaną bazę i wróć do danych domyślnych"
            >
              Wyczyść import
            </button>
          )}
          <button
            onClick={waliduj}
            className="btn-dark"
            title="Sprawdź dane pod import do SOWA (PESEL, słowniki, pola wymagane)"
          >
            <span className="material-symbols-rounded text-[18px]">
              rule
            </span>
            Waliduj (SOWA)
          </button>
          <button
            onClick={eksportuj}
            disabled={uczestnicy.length === 0}
            className="btn-dark"
            title="Pobierz CSV w formacie Import SOWA (43 kolumny, średnik, UTF-8 BOM)"
          >
            <span className="material-symbols-rounded text-[18px]">
              download
            </span>
            Eksport CSV (SOWA)
          </button>
          <button
            onClick={() => setPokazGenerator(true)}
            disabled={uczestnicy.length === 0}
            className={zaznaczeni.size > 0 ? "btn-primary" : "btn-dark"}
            title="Generuj wybrane dokumenty dla zaznaczonych uczestników (ZIP)"
          >
            <span className="material-symbols-rounded text-[18px]">
              folder_zip
            </span>
            Generuj dokumenty
            {zaznaczeni.size > 0 ? ` (${zaznaczeni.size})` : "…"}
          </button>
          <button
            onClick={() => setPokazFormularz(true)}
            className="btn-dark"
            title="Dodaj uczestnika — formularz z walidacją PESEL i słownikami SOWA"
          >
            <span className="material-symbols-rounded text-[18px]">
              person_add
            </span>
            Dodaj uczestnika
          </button>
        </div>
      </div>

      {komunikat && (
        <div className="card anim-fade-in px-4 py-3 text-sm text-ink">
          {komunikat}
        </div>
      )}

      {walidacja && (
        <div className="card anim-card-in overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 className="m-0 font-serif text-[17px] font-semibold text-ink-strong">
              Walidacja pod import SOWA
            </h2>
            <div className="flex items-center gap-2 text-[12.5px] font-bold">
              <span className="rounded-full bg-red-soft px-[11px] py-[5px] text-red-ink">
                {walidacja.bledy} błędów
              </span>
              <span className="rounded-full bg-amber-soft px-[11px] py-[5px] text-amber-ink">
                {walidacja.ostrzezenia} ostrzeżeń
              </span>
              <span className="rounded-full bg-green-soft px-[11px] py-[5px] text-primary-strong">
                {walidacja.czysci} bez uwag
              </span>
              <button
                onClick={() => setWalidacja(null)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-faint hover:bg-soft"
                title="Zamknij"
              >
                <span className="material-symbols-rounded text-lg">close</span>
              </button>
            </div>
          </div>
          {walidacja.problemy.length === 0 ? (
            <p className="m-0 px-5 py-4 text-sm text-primary-strong">
              ✓ Wszystkie dane przechodzą walidację — baza gotowa do eksportu.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {uczestnicy
                .filter((u) =>
                  walidacja.problemy.some((p) => p.uczestnikId === u.id),
                )
                .map((u) => {
                  const problemy = walidacja.problemy.filter(
                    (p) => p.uczestnikId === u.id,
                  );
                  return (
                    <div
                      key={u.id}
                      className="border-t border-line-soft px-5 py-3"
                    >
                      <Link
                        href={`/uczestnicy/${u.id}`}
                        className="text-sm font-bold text-ink hover:text-primary-strong"
                      >
                        {u.nazwisko} {u.imie}
                      </Link>
                      <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                        {problemy.map((p, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[13px] leading-snug"
                          >
                            <span
                              className={`material-symbols-rounded mt-px shrink-0 text-base ${
                                p.poziom === "blad"
                                  ? "text-red-ink"
                                  : "text-amber-ink"
                              }`}
                            >
                              {p.poziom === "blad" ? "error" : "warning"}
                            </span>
                            <span className="text-ink-mid">
                              <span className="font-semibold">{p.pole}:</span>{" "}
                              {p.komunikat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="search"
          value={szukaj}
          onChange={(e) => setSzukaj(e.target.value)}
          placeholder="Szukaj po imieniu i nazwisku…"
          className="w-72 rounded-xl border border-line-strong bg-surface px-3.5 py-[9px] text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-[oklch(0.62_0.09_152)] focus:shadow-[0_0_0_3px_oklch(0.55_0.09_152/0.12)]"
        />
        <span className="text-sm text-faint">
          {widoczni.length} z {uczestnicy.length} · projekt „{projekt.skrot}”
        </span>
      </div>

      <div className="card anim-card-in overflow-hidden">
        <div className="grid grid-cols-[28px_minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_52px] items-center gap-4 border-b border-line px-[22px] py-3.5">
          <input
            type="checkbox"
            checked={
              widoczni.length > 0 &&
              widoczni.every((u) => zaznaczeni.has(u.id))
            }
            onChange={(e) =>
              setZaznaczeni(
                e.target.checked
                  ? new Set([
                      ...zaznaczeni,
                      ...widoczni.map((u) => u.id),
                    ])
                  : new Set(
                      [...zaznaczeni].filter(
                        (id) => !widoczni.some((u) => u.id === id),
                      ),
                    ),
              )
            }
            className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
            title="Zaznacz wszystkich widocznych"
          />
          <div className="th-label">Uczestnik</div>
          <div className="th-label">Ścieżka reintegracji</div>
          <div className="th-label">Obecność</div>
          <div className="th-label">Dokumenty</div>
          <div />
        </div>
        {widoczni.map((u, i) => {
          const nazwa = `${u.imie} ${u.nazwisko}`;
          const braki = brakiWTeczce(u, projekt.spec).length;
          return (
            <div
              key={u.id}
              className={`anim-card-in grid grid-cols-[28px_minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_52px] items-center gap-4 border-t border-line-soft px-[22px] py-[15px] transition-colors ${
                zaznaczeni.has(u.id) ? "bg-green-soft/40" : "hover:bg-hover-row"
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <input
                type="checkbox"
                checked={zaznaczeni.has(u.id)}
                onChange={() => przelaczZaznaczenie(u.id)}
                className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
                title="Zaznacz uczestnika"
              />
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nazwa={nazwa} size={40} />
                <div className="min-w-0">
                  <Link
                    href={`/uczestnicy/${u.id}`}
                    className="block truncate text-[14.5px] font-bold text-ink hover:text-primary-strong"
                  >
                    {u.nazwisko} {u.imie}
                  </Link>
                  <span className="mt-1 inline-flex items-center gap-1.5">
                    <SciezkaPill sciezka={u.sciezka} />
                    {u.status !== "aktywny" && <StatusPill status={u.status} />}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] text-muted">
                    {etapyNazwy[u.etapSciezki ?? 0]}
                  </span>
                  <span className="font-serif text-sm font-semibold text-primary-strong">
                    {u.postepSciezki ?? 0}%
                  </span>
                </div>
                <Pasek pct={u.postepSciezki ?? 0} delay={i * 0.05} />
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[19px] text-faint">
                  event_available
                </span>
                <span className="text-[15px] font-bold text-ink-mid">
                  {u.status === "aktywny" ? `${u.frekwencja}%` : "—"}
                </span>
              </div>
              <div>
                <BrakiPill braki={braki} />
              </div>
              <Link
                href={`/uczestnicy/${u.id}`}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-line bg-surface text-primary-strong transition-[background,transform] hover:translate-x-0.5 hover:bg-green-soft"
                title="Otwórz kartotekę"
              >
                <span className="material-symbols-rounded text-[21px]">
                  folder_open
                </span>
              </Link>
            </div>
          );
        })}
        {widoczni.length === 0 && (
          <div className="px-[22px] py-8 text-center text-sm text-faint">
            {uczestnicy.length === 0
              ? "Brak uczestników w projekcie — zaimportuj bazę z pliku Excel/CSV (struktura SOWA)."
              : "Brak wyników dla podanych filtrów."}
          </div>
        )}
      </div>

      <p className="text-xs text-faint">
        Import obsługuje pliki .xlsx i .csv w strukturze SOWA (Import
        uczestników / CIS_uczestnicy.xlsx). Dane pozostają w przeglądarce —
        baza z logowaniem i historią zmian to etap E1.
      </p>

      {pokazGenerator && (
        <WyborGeneratora
          spec={projekt.spec}
          uczestnicy={uczestnicy}
          domyslniUczestnicy={
            zaznaczeni.size > 0 ? [...zaznaczeni] : undefined
          }
          onClose={() => setPokazGenerator(false)}
          onDone={(k) => setKomunikat(k)}
        />
      )}

      {pokazFormularz && (
        <FormularzUczestnika
          projektId={projekt.id}
          istniejacy={uczestnicy}
          onClose={() => setPokazFormularz(false)}
          onSave={(u) => {
            dodajUczestnika(u);
            setKomunikat(
              `✓ Dodano uczestnika: ${u.nazwisko} ${u.imie} (${u.sciezka}, ${u.status}).`,
            );
          }}
        />
      )}
    </div>
  );
}
