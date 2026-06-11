"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { brakiWTeczce } from "@/lib/projekt-spec";
import { useProjekt } from "@/components/ProjektProvider";
import { etapyNazwy } from "@/lib/mock-data";
import { Avatar, BrakiPill, Pasek, SciezkaPill, StatusPill } from "@/components/ui";
import type { KategoriaUczestnika } from "@/lib/types";

type FiltrKategorii = "wszyscy" | KategoriaUczestnika;

export default function Uczestnicy() {
  const { projekt, uczestnicy, zaimportowano, importuj, wyczyscImport } =
    useProjekt();
  const [szukaj, setSzukaj] = useState("");
  const [kategoria, setKategoria] = useState<FiltrKategorii>("wszyscy");
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [trwaImport, setTrwaImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
          <button className="btn-dark" title="Formularz dodawania — etap E1">
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
        <div className="grid grid-cols-[minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_52px] items-center gap-4 border-b border-line px-[22px] py-3.5">
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
              className="anim-card-in grid grid-cols-[minmax(200px,1.7fr)_minmax(190px,1.9fr)_130px_140px_52px] items-center gap-4 border-t border-line-soft px-[22px] py-[15px] transition-colors hover:bg-hover-row"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
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
    </div>
  );
}
