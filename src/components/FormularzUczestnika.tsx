"use client";

// Formularz dodawania uczestnika — walidacja na bieżąco (PESEL, słowniki SOWA).
// Zapis do lokalnej bazy projektu; etap E1 przeniesie zapis do bazy online.

import { useState } from "react";
import {
  FORMATY,
  SLOWNIK_STATUS_RYNKU_PRACY,
  SLOWNIK_WYKSZTALCENIE,
  walidujPesel,
  wiekWDniu,
} from "@/lib/slowniki";
import type { Uczestnik } from "@/lib/types";

export default function FormularzUczestnika({
  projektId,
  istniejacy,
  onClose,
  onSave,
}: {
  projektId: string;
  istniejacy: Uczestnik[];
  onClose: () => void;
  onSave: (u: Uczestnik) => void;
}) {
  const [f, setF] = useState({
    imie: "",
    nazwisko: "",
    pesel: "",
    wyksztalcenie: "",
    statusRynkuPracy: "",
    miejscowosc: "",
    gmina: "",
    powiat: "",
    wojewodztwo: "lubuskie",
    kodPocztowy: "",
    telefon: "",
    email: "",
    dataPrzystapienia: "",
    grupa: "",
    cykl: "1",
  });
  const [bledy, setBledy] = useState<Record<string, string>>({});

  const set = (k: keyof typeof f) => (v: string) =>
    setF((s) => ({ ...s, [k]: v }));

  function waliduj(): boolean {
    const b: Record<string, string> = {};
    if (!f.imie.trim()) b.imie = "Wpisz imię";
    if (!f.nazwisko.trim()) b.nazwisko = "Wpisz nazwisko";
    const wp = walidujPesel(f.pesel);
    if (!wp.poprawny) b.pesel = wp.blad ?? "Niepoprawny PESEL";
    else if (istniejacy.some((u) => u.sowa?.pesel === f.pesel))
      b.pesel = "Uczestnik z tym numerem PESEL już jest w bazie";
    if (!f.wyksztalcenie) b.wyksztalcenie = "Wybierz ze słownika";
    if (!f.statusRynkuPracy) b.statusRynkuPracy = "Wybierz ze słownika";
    if (f.statusRynkuPracy === "Osoba pracująca")
      b.statusRynkuPracy =
        "Osoba pracująca nie kwalifikuje się do wsparcia CIS (bezrobotni/bierni)";
    if (f.kodPocztowy && !FORMATY.kodPocztowy.wzor.test(f.kodPocztowy))
      b.kodPocztowy = `Format: ${FORMATY.kodPocztowy.opis}`;
    if (f.dataPrzystapienia && !FORMATY.data.wzor.test(f.dataPrzystapienia))
      b.dataPrzystapienia = FORMATY.data.opis;
    if (f.email && !FORMATY.email.wzor.test(f.email))
      b.email = FORMATY.email.opis;
    setBledy(b);
    return Object.keys(b).length === 0;
  }

  function zapisz() {
    if (!waliduj()) return;
    const wp = walidujPesel(f.pesel);
    const kategoria =
      f.statusRynkuPracy === "Osoba bezrobotna" ? "bezrobotny" : "bierny";
    const wiek =
      wp.dataUrodzenia && f.dataPrzystapienia
        ? wiekWDniu(wp.dataUrodzenia, f.dataPrzystapienia)
        : undefined;
    const u: Uczestnik = {
      id: `${projektId}-${Date.now().toString(36)}`,
      imie: f.imie.trim(),
      nazwisko: f.nazwisko.trim(),
      kategoria,
      sciezka: kategoria === "bezrobotny" ? "IPZS" : "IPR",
      cykl: f.cykl === "2" ? 2 : 1,
      grupa: f.grupa.trim() || "—",
      status: f.dataPrzystapienia ? "aktywny" : "rezerwowy",
      dataPrzystapienia: f.dataPrzystapienia || "—",
      frekwencja: 0,
      posiadaneDokumenty: [],
      etapSciezki: 0,
      postepSciezki: 0,
      sowa: {
        pesel: f.pesel,
        plec: wp.plec === "Kobieta" ? "kobieta" : "mężczyzna",
        wiek: wiek ?? undefined,
        wyksztalcenie: f.wyksztalcenie,
        obywatelstwo: "polskie",
        kraj: "Polska",
        wojewodztwo: f.wojewodztwo || undefined,
        powiat: f.powiat || undefined,
        gmina: f.gmina || undefined,
        miejscowosc: f.miejscowosc || undefined,
        kodPocztowy: f.kodPocztowy || undefined,
        telefon: f.telefon || undefined,
        email: f.email || undefined,
        statusRynkuPracy: f.statusRynkuPracy,
      },
    };
    onSave(u);
    onClose();
  }

  const wp = f.pesel.length === 11 ? walidujPesel(f.pesel) : null;

  const Pole = ({
    label,
    klucz,
    hint,
    szeroki,
  }: {
    label: string;
    klucz: keyof typeof f;
    hint?: string;
    szeroki?: boolean;
  }) => (
    <div className={szeroki ? "sm:col-span-2" : ""}>
      <label className="th-label mb-1 block">{label}</label>
      <input
        value={f[klucz]}
        onChange={(e) => set(klucz)(e.target.value)}
        placeholder={hint}
        className={`w-full rounded-xl border px-3 py-2 text-sm text-ink outline-none ${
          bledy[klucz]
            ? "border-red-ink bg-red-soft/40"
            : "border-line-strong bg-surface focus:border-[oklch(0.62_0.09_152)]"
        }`}
      />
      {bledy[klucz] && (
        <p className="m-0 mt-1 text-xs text-red-ink">{bledy[klucz]}</p>
      )}
    </div>
  );

  const Slownik = ({
    label,
    klucz,
    opcje,
  }: {
    label: string;
    klucz: keyof typeof f;
    opcje: readonly string[];
  }) => (
    <div className="sm:col-span-2">
      <label className="th-label mb-1 block">{label}</label>
      <select
        value={f[klucz]}
        onChange={(e) => set(klucz)(e.target.value)}
        className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-sm text-ink outline-none ${
          bledy[klucz]
            ? "border-red-ink bg-red-soft/40"
            : "border-line-strong bg-surface"
        }`}
      >
        <option value="">— wybierz ze słownika —</option>
        {opcje.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {bledy[klucz] && (
        <p className="m-0 mt-1 text-xs text-red-ink">{bledy[klucz]}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
            Nowy uczestnik
          </h3>
          <button
            onClick={onClose}
            className="text-faint hover:text-ink"
            title="Zamknij"
          >
            <span className="material-symbols-rounded text-[22px]">close</span>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3.5 overflow-y-auto px-6 py-4 sm:grid-cols-2">
          <Pole label="Imię *" klucz="imie" />
          <Pole label="Nazwisko *" klucz="nazwisko" />
          <div className="sm:col-span-2">
            <label className="th-label mb-1 block">PESEL *</label>
            <input
              value={f.pesel}
              onChange={(e) =>
                set("pesel")(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="11 cyfr — płeć i data urodzenia rozpoznawane automatycznie"
              className={`w-full rounded-xl border px-3 py-2 font-mono text-sm text-ink outline-none ${
                bledy.pesel
                  ? "border-red-ink bg-red-soft/40"
                  : "border-line-strong bg-surface focus:border-[oklch(0.62_0.09_152)]"
              }`}
            />
            {bledy.pesel && (
              <p className="m-0 mt-1 text-xs text-red-ink">{bledy.pesel}</p>
            )}
            {wp?.poprawny && (
              <p className="m-0 mt-1 text-xs text-primary-strong">
                ✓ PESEL poprawny — {wp.plec}, ur. {wp.dataUrodzenia}
              </p>
            )}
          </div>
          <Slownik
            label="Wykształcenie (słownik ISCED) *"
            klucz="wyksztalcenie"
            opcje={SLOWNIK_WYKSZTALCENIE}
          />
          <Slownik
            label="Status na rynku pracy *"
            klucz="statusRynkuPracy"
            opcje={SLOWNIK_STATUS_RYNKU_PRACY}
          />
          <Pole label="Miejscowość (TERYT)" klucz="miejscowosc" />
          <Pole label="Gmina (TERYT)" klucz="gmina" />
          <Pole label="Powiat" klucz="powiat" hint="np. świebodziński" />
          <Pole label="Województwo" klucz="wojewodztwo" />
          <Pole label="Kod pocztowy" klucz="kodPocztowy" hint="00-000" />
          <Pole label="Telefon" klucz="telefon" />
          <Pole label="E-mail" klucz="email" hint="bez polskich znaków" szeroki />
          <Pole
            label="Data przystąpienia"
            klucz="dataPrzystapienia"
            hint="RRRR-MM-DD (puste = lista rezerwowa)"
          />
          <Pole label="Grupa" klucz="grupa" hint="np. A" />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            Kategoria (IPZS/IPR) ustawiana automatycznie ze statusu na rynku
            pracy; płeć i wiek — z numeru PESEL.
          </span>
          <button onClick={zapisz} className="btn-primary">
            <span className="material-symbols-rounded text-[19px]">
              person_add
            </span>
            Dodaj uczestnika
          </button>
        </div>
      </div>
    </div>
  );
}
