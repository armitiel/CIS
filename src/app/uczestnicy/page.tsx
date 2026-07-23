"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { brakiWTeczce } from "@/lib/projekt-spec";
import { useProjekt } from "@/components/ProjektProvider";
import { etapyNazwy } from "@/lib/mock-data";
import { Avatar, BrakiPill, Pasek, SciezkaPill, StatusPill } from "@/components/ui";
import { walidujBaze, type WynikWalidacji } from "@/lib/sowa-walidacja";
import { eksportujCSV, pobierzCSV } from "@/lib/sowa-eksport";
import FormularzUczestnika from "@/components/FormularzUczestnika";
import WyslijSMS from "@/components/WyslijSMS";
import type { KategoriaUczestnika, Uczestnik } from "@/lib/types";

type FiltrKategorii = "wszyscy" | KategoriaUczestnika;

export default function Uczestnicy() {
  const {
    projekt,
    uczestnicy,
    zaimportowano,
    importuj,
    wyczyscImport,
    dodajUczestnika,
    aktualizujUczestnika,
  } = useProjekt();
  const [szukaj, setSzukaj] = useState("");
  const [kategoria, setKategoria] = useState<FiltrKategorii>("wszyscy");
  const [grupaFiltr, setGrupaFiltr] = useState<string>("wszyscy");
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [trwaImport, setTrwaImport] = useState(false);
  const [walidacja, setWalidacja] = useState<WynikWalidacji | null>(null);
  const [pokazFormularz, setPokazFormularz] = useState(false);
  const [edytowany, setEdytowany] = useState<Uczestnik | null>(null);
  const [pokazSMS, setPokazSMS] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        "Dane pochodzą z pełnego formularza uczestnika; przed importem użyj przycisku „Waliduj SOWA”.",
    );
  }

  // zapytanie z wyszukiwarki w nagłówku (/uczestnicy?q=…)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSzukaj(q);
  }, []);

  const grupy = useMemo(
    () =>
      Array.from(
        new Set(
          uczestnicy
            .map((u) => u.grupa)
            .filter((g): g is string => !!g && g !== "—"),
        ),
      ).sort(),
    [uczestnicy],
  );

  const widoczni = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    return uczestnicy.filter((u) => {
      if (kategoria !== "wszyscy" && u.kategoria !== kategoria) return false;
      if (grupaFiltr !== "wszyscy" && u.grupa !== grupaFiltr) return false;
      if (q && !`${u.imie} ${u.nazwisko}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [uczestnicy, szukaj, kategoria, grupaFiltr]);

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
          `✓ Import zakończony: dodano ${wynik.dodano ?? wynik.uczestnicy.length}, ` +
            `zaktualizowano ${wynik.zaktualizowano ?? 0}, ` +
            `w bazie łącznie ${wynik.lacznie ?? wynik.uczestnicy.length} osób. ` +
            `Nie usunięto wcześniejszych uczestników. Plik: „${file.name}”.` +
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
          {grupy.length > 0 && (
            <select
              value={grupaFiltr}
              onChange={(e) => setGrupaFiltr(e.target.value)}
              title="Filtruj według grupy"
              className="cursor-pointer rounded-[10px] border border-line-strong bg-surface px-3 py-2 text-[13.5px] font-semibold text-ink-mid outline-none hover:bg-soft focus:border-[oklch(0.62_0.09_152)]"
            >
              <option value="wszyscy">Wszystkie grupy</option>
              {grupy.map((g) => (
                <option key={g} value={g}>
                  Grupa {g}
                </option>
              ))}
            </select>
          )}
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
            <span className="material-symbols-rounded notranslate text-[19px]">
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
            <span className="material-symbols-rounded notranslate text-[18px]">
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
            <span className="material-symbols-rounded notranslate text-[18px]">
              download
            </span>
            Eksport CSV (SOWA)
          </button>
          <button
            onClick={() => setPokazSMS(true)}
            disabled={uczestnicy.length === 0}
            className="btn-dark"
            title="Wyślij SMS (przypomnienie) do uczestników — przez Zadarma"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              sms
            </span>
            Wyślij SMS
          </button>
          <button
            onClick={() => setPokazFormularz(true)}
            className="btn-dark"
            title="Dodaj uczestnika — formularz z walidacją PESEL i słownikami SOWA"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
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
                <span className="material-symbols-rounded notranslate text-lg">close</span>
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
                              className={`material-symbols-rounded notranslate mt-px shrink-0 text-base ${
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
        {/* nagłówek tabeli — tylko desktop */}
        <div className="hidden grid-cols-[minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_92px] items-center gap-4 border-b border-line px-[22px] py-3.5 lg:grid">
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
              className="anim-card-in flex flex-col gap-3 border-t border-line-soft px-4 py-4 transition-colors hover:bg-hover-row lg:grid lg:grid-cols-[minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_92px] lg:items-center lg:gap-4 lg:px-[22px] lg:py-[15px]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* górny rząd: osoba + (mobile) skróty edycji/kartoteki */}
              <div className="flex items-center gap-3 lg:contents">
                <div className="flex min-w-0 flex-1 items-center gap-3">
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
                      {u.status !== "aktywny" && (
                        <StatusPill status={u.status} />
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setEdytowany(u)}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-ink-mid lg:hidden"
                  title="Edytuj / uzupełnij dane"
                >
                  <span className="material-symbols-rounded notranslate text-[20px]">
                    edit
                  </span>
                </button>
                <Link
                  href={`/uczestnicy/${u.id}`}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-primary-strong lg:hidden"
                  title="Otwórz kartotekę"
                >
                  <span className="material-symbols-rounded notranslate text-[21px]">
                    folder_open
                  </span>
                </Link>
              </div>

              {/* ścieżka reintegracji */}
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

              {/* obecność + dokumenty: w jednym rzędzie na mobile */}
              <div className="flex items-center justify-between gap-4 lg:contents">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded notranslate text-[19px] text-faint">
                    event_available
                  </span>
                  <span className="text-[15px] font-bold text-ink-mid">
                    {u.status === "aktywny" ? `${u.frekwencja}%` : "—"}
                  </span>
                </div>
                <div>
                  <BrakiPill braki={braki} />
                </div>
              </div>

              {/* akcje — desktop: edycja + kartoteka */}
              <div className="hidden items-center justify-end gap-1.5 lg:flex">
                <button
                  onClick={() => setEdytowany(u)}
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-line bg-surface text-ink-mid transition-colors hover:bg-soft"
                  title="Edytuj / uzupełnij dane uczestnika"
                >
                  <span className="material-symbols-rounded notranslate text-[20px]">
                    edit
                  </span>
                </button>
                <Link
                  href={`/uczestnicy/${u.id}`}
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-line bg-surface text-primary-strong transition-[background,transform] hover:translate-x-0.5 hover:bg-green-soft"
                  title="Otwórz kartotekę"
                >
                  <span className="material-symbols-rounded notranslate text-[21px]">
                    folder_open
                  </span>
                </Link>
              </div>
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
        Import obsługuje pliki .xlsx i .csv w strukturze SOWA (np. Import
        uczestników / Uczestnicy_projektu_Efs).
      </p>

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

      {edytowany && (
        <FormularzUczestnika
          projektId={projekt.id}
          istniejacy={uczestnicy}
          edytowany={edytowany}
          onClose={() => setEdytowany(null)}
          onSave={(zm) => {
            aktualizujUczestnika(edytowany.id, zm);
            setKomunikat(
              `✓ Zaktualizowano dane: ${zm.nazwisko} ${zm.imie}.`,
            );
          }}
        />
      )}

      {pokazSMS && (
        <WyslijSMS
          uczestnicy={uczestnicy}
          projektSkrot={projekt.skrot}
          onClose={() => setPokazSMS(false)}
        />
      )}
    </div>
  );
}
