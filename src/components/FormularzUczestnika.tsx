"use client";

// Formularz dodawania uczestnika — walidacja na bieżąco (PESEL, słowniki SOWA).
// Zapis do lokalnej bazy projektu; etap E1 przeniesie zapis do bazy online.

import { useState } from "react";
import {
  FORMATY,
  SLOWNIK_STATUS_RYNKU_PRACY,
  SLOWNIK_TAK_NIE,
  SLOWNIK_W_TYM,
  SLOWNIK_WOJEWODZTWA,
  SLOWNIK_WYKSZTALCENIE,
  walidujPesel,
  wiekWDniu,
} from "@/lib/slowniki";
import { SLOWNIK_OBYWATELSTWO } from "@/lib/sowa-walidacja";
import { powiatyDlaWojewodztwa } from "@/lib/powiaty";
import type { Uczestnik } from "@/lib/types";

const STATUSY_UDZIALU = ["aktywny", "rezerwowy", "zakończył", "przerwał"] as const;
const DEGURBA = ["1", "2", "3"] as const;
const RODZAJE_UCZESTNIKA = ["Indywidualny", "Instytucjonalny"] as const;

export default function FormularzUczestnika({
  projektId,
  istniejacy,
  edytowany,
  onClose,
  onSave,
}: {
  projektId: string;
  istniejacy: Uczestnik[];
  edytowany?: Uczestnik | null;
  onClose: () => void;
  onSave: (u: Uczestnik) => void;
}) {
  const [f, setF] = useState({
    imie: edytowany?.imie ?? "",
    nazwisko: edytowany?.nazwisko ?? "",
    rodzajUczestnika: edytowany?.sowa?.rodzajUczestnika ?? "Indywidualny",
    nazwaInstytucji: edytowany?.sowa?.nazwaInstytucji ?? "",
    pesel: edytowany?.sowa?.pesel ?? "",
    brakPesel: edytowany?.sowa?.brakPesel ?? "Nie",
    technicznyId: edytowany?.sowa?.technicznyId ?? "",
    wyksztalcenie: edytowany?.sowa?.wyksztalcenie ?? "",
    statusRynkuPracy: edytowany?.sowa?.statusRynkuPracy ?? "",
    wTymStatus: edytowany?.sowa?.wTymStatus ?? "",
    status: edytowany?.status ?? "aktywny",
    obywatelstwo: edytowany?.sowa?.obywatelstwo
      ? edytowany.sowa.obywatelstwo.toLowerCase().includes("pol")
        ? "Obywatelstwo polskie"
        : edytowany.sowa.obywatelstwo
      : "Obywatelstwo polskie",
    kraj: edytowany?.sowa?.kraj ?? "Polska",
    miejscowosc: edytowany?.sowa?.miejscowosc ?? "",
    gmina: edytowany?.sowa?.gmina ?? "",
    powiat: edytowany?.sowa?.powiat ?? "",
    wojewodztwo: edytowany?.sowa?.wojewodztwo ?? "lubuskie",
    ulica: edytowany?.sowa?.ulica ?? "",
    nrDomu: edytowany?.sowa?.nrDomu ?? "",
    nrLokalu: edytowany?.sowa?.nrLokalu ?? "",
    kodPocztowy: edytowany?.sowa?.kodPocztowy ?? "",
    degurba: edytowany?.sowa?.degurba ?? "",
    telefon: edytowany?.sowa?.telefon ?? "",
    email: edytowany?.sowa?.email ?? "",
    dataZakonczeniaUdzialu:
      edytowany?.sowa?.dataZakonczeniaUdzialu ?? "",
    planowanaDataZakonczeniaEdukacji:
      edytowany?.sowa?.planowanaDataZakonczeniaEdukacji ?? "",
    sytuacjaPoZakonczeniu: edytowany?.sowa?.sytuacjaPoZakonczeniu ?? "",
    zakonczenieZgodneZeSciezka:
      edytowany?.sowa?.zakonczenieZgodneZeSciezka ?? "",
    zakresWsparcia: edytowany?.sowa?.zakresWsparcia ?? "",
    rodzajWsparcia: edytowany?.sowa?.rodzajWsparcia ?? "",
    wTymWsparcia: edytowany?.sowa?.wTymWsparcia ?? "",
    dataRozpoczeciaWsparcia:
      edytowany?.sowa?.dataRozpoczeciaWsparcia ?? "",
    dataZalozeniaDG: edytowany?.sowa?.dataZalozeniaDG ?? "",
    osobaObcegoPochodzenia:
      edytowany?.sowa?.osobaObcegoPochodzenia ?? "Nie",
    obywatelPanstwaTrzeciego:
      edytowany?.sowa?.obywatelPanstwaTrzeciego ?? "Nie",
    mniejszosc: edytowany?.sowa?.mniejszosc ?? "Nie",
    bezdomnosc: edytowany?.sowa?.bezdomnosc ?? "Nie",
    niepelnosprawnosc: edytowany?.sowa?.niepelnosprawnosc ?? "Nie",
    uwagi: edytowany?.sowa?.uwagi ?? "",
    dataPrzystapienia:
      edytowany?.dataPrzystapienia && edytowany.dataPrzystapienia !== "—"
        ? edytowany.dataPrzystapienia
        : "",
    grupa: edytowany?.grupa && edytowany.grupa !== "—" ? edytowany.grupa : "",
    cykl: String(edytowany?.cykl ?? "1"),
  });
  const [bledy, setBledy] = useState<Record<string, string>>({});

  const set = (k: keyof typeof f) => (v: string) =>
    setF((s) => ({ ...s, [k]: v }));

  function waliduj(): boolean {
    const b: Record<string, string> = {};
    if (!f.imie.trim()) b.imie = "Wpisz imię";
    if (!f.nazwisko.trim()) b.nazwisko = "Wpisz nazwisko";
    if (f.rodzajUczestnika === "Instytucjonalny" && !f.nazwaInstytucji.trim())
      b.nazwaInstytucji = "Wpisz nazwę instytucji";
    const wp = walidujPesel(f.pesel);
    if (f.brakPesel !== "Tak" && !wp.poprawny)
      b.pesel = wp.blad ?? "Niepoprawny PESEL";
    else if (
      f.brakPesel !== "Tak" &&
      istniejacy.some(
        (u) => u.sowa?.pesel === f.pesel && u.id !== edytowany?.id,
      )
    )
      b.pesel = "Uczestnik z tym numerem PESEL już jest w bazie";
    if (!f.wyksztalcenie) b.wyksztalcenie = "Wybierz ze słownika";
    if (!f.statusRynkuPracy) b.statusRynkuPracy = "Wybierz ze słownika";
    if (f.statusRynkuPracy === "Osoba bezrobotna" && !f.wTymStatus)
      b.wTymStatus = "Wybierz wartość pola „w tym”";
    if (!f.status) b.status = "Wybierz status udziału";
    if (projektId === "cis-2026" && f.statusRynkuPracy === "Osoba pracująca")
      b.statusRynkuPracy =
        "Osoba pracująca nie kwalifikuje się do wsparcia CIS (bezrobotni/bierni)";
    if (!f.obywatelstwo) b.obywatelstwo = "Wybierz obywatelstwo";
    if (!f.kraj.trim()) b.kraj = "Wpisz kraj";
    if (!f.wojewodztwo) b.wojewodztwo = "Wybierz województwo";
    if (!f.powiat) b.powiat = "Wybierz powiat";
    if (!f.gmina.trim()) b.gmina = "Wpisz gminę wg TERYT";
    if (!f.miejscowosc.trim()) b.miejscowosc = "Wpisz miejscowość wg TERYT";
    if (!f.kodPocztowy) b.kodPocztowy = "Wpisz kod pocztowy";
    else if (!FORMATY.kodPocztowy.wzor.test(f.kodPocztowy))
      b.kodPocztowy = `Format: ${FORMATY.kodPocztowy.opis}`;
    if (!f.degurba) b.degurba = "Wybierz stopień DEGURBA";
    if (!f.telefon.trim()) b.telefon = "Wpisz telefon kontaktowy";
    else if (!FORMATY.telefon.wzor.test(f.telefon))
      b.telefon = FORMATY.telefon.opis;
    if (!f.email.trim()) b.email = "Wpisz adres e-mail";
    else if (!FORMATY.email.wzor.test(f.email)) b.email = FORMATY.email.opis;
    if (f.status === "aktywny" && !f.dataPrzystapienia)
      b.dataPrzystapienia = "Aktywny uczestnik musi mieć datę przystąpienia";
    if (f.dataPrzystapienia && !FORMATY.data.wzor.test(f.dataPrzystapienia))
      b.dataPrzystapienia = FORMATY.data.opis;
    if (!f.zakresWsparcia.trim()) b.zakresWsparcia = "Wpisz zakres wsparcia";
    if (!f.rodzajWsparcia.trim())
      b.rodzajWsparcia = "Wpisz rodzaj przyznanego wsparcia";
    if (!f.wTymWsparcia.trim()) b.wTymWsparcia = "Uzupełnij pole „w tym”";
    if (!f.dataRozpoczeciaWsparcia)
      b.dataRozpoczeciaWsparcia = "Wpisz datę rozpoczęcia wsparcia";
    for (const k of [
      "dataZakonczeniaUdzialu",
      "planowanaDataZakonczeniaEdukacji",
      "dataRozpoczeciaWsparcia",
      "dataZalozeniaDG",
    ] as const) {
      if (f[k] && !FORMATY.data.wzor.test(f[k])) b[k] = FORMATY.data.opis;
    }
    setBledy(b);
    return Object.keys(b).length === 0;
  }

  function zapisz() {
    if (!waliduj()) return;
    const wp = walidujPesel(f.pesel);
    const kategoria =
      f.statusRynkuPracy === "Osoba bezrobotna" ? "bezrobotny" : "bierny";
    // wiek liczony na dzień przystąpienia, a dla listy rezerwowej (brak daty)
    // — na dziś; data urodzenia bierze się zawsze z numeru PESEL
    const dataOdniesienia =
      f.dataPrzystapienia || new Date().toISOString().slice(0, 10);
    const wiek = wp.dataUrodzenia
      ? wiekWDniu(wp.dataUrodzenia, dataOdniesienia)
      : undefined;
    const u: Uczestnik = {
      // przy edycji zachowujemy id oraz pola spoza formularza (frekwencja,
      // teczka, etap/postęp ścieżki, dane SOWA jak DEGURBA)
      ...(edytowany ?? {}),
      id: edytowany?.id ?? `${projektId}-${Date.now().toString(36)}`,
      imie: f.imie.trim(),
      nazwisko: f.nazwisko.trim(),
      kategoria,
      sciezka: kategoria === "bezrobotny" ? "IPZS" : "IPR",
      cykl: f.cykl === "2" ? 2 : 1,
      grupa: f.grupa.trim() || "—",
      status: f.status as Uczestnik["status"],
      dataPrzystapienia: f.dataPrzystapienia || "—",
      frekwencja: edytowany?.frekwencja ?? 0,
      posiadaneDokumenty: edytowany?.posiadaneDokumenty ?? [],
      etapSciezki: edytowany?.etapSciezki ?? 0,
      postepSciezki: edytowany?.postepSciezki ?? 0,
      sowa: {
        ...(edytowany?.sowa ?? {}),
        rodzajUczestnika: f.rodzajUczestnika as
          | "Indywidualny"
          | "Instytucjonalny",
        nazwaInstytucji: f.nazwaInstytucji || undefined,
        pesel: f.brakPesel === "Tak" ? undefined : f.pesel,
        brakPesel: f.brakPesel as "Tak" | "Nie",
        technicznyId: f.technicznyId || undefined,
        plec: wp.plec
          ? wp.plec === "Kobieta"
            ? "kobieta"
            : "mężczyzna"
          : edytowany?.sowa?.plec,
        dataUrodzenia: wp.dataUrodzenia ?? edytowany?.sowa?.dataUrodzenia,
        wiek: wiek ?? edytowany?.sowa?.wiek ?? undefined,
        wyksztalcenie: f.wyksztalcenie,
        obywatelstwo: f.obywatelstwo || undefined,
        kraj: f.kraj || undefined,
        wojewodztwo: f.wojewodztwo || undefined,
        powiat: f.powiat || undefined,
        gmina: f.gmina || undefined,
        miejscowosc: f.miejscowosc || undefined,
        ulica: f.ulica || undefined,
        nrDomu: f.nrDomu || undefined,
        nrLokalu: f.nrLokalu || undefined,
        kodPocztowy: f.kodPocztowy || undefined,
        degurba: (f.degurba || undefined) as "1" | "2" | "3" | undefined,
        telefon: f.telefon || undefined,
        email: f.email || undefined,
        statusRynkuPracy: f.statusRynkuPracy,
        wTymStatus:
          f.wTymStatus || SLOWNIK_W_TYM[f.statusRynkuPracy]?.[0] || undefined,
        dataZakonczeniaUdzialu: f.dataZakonczeniaUdzialu || undefined,
        planowanaDataZakonczeniaEdukacji:
          f.planowanaDataZakonczeniaEdukacji || undefined,
        sytuacjaPoZakonczeniu: f.sytuacjaPoZakonczeniu || undefined,
        zakonczenieZgodneZeSciezka:
          f.zakonczenieZgodneZeSciezka || undefined,
        zakresWsparcia: f.zakresWsparcia || undefined,
        rodzajWsparcia: f.rodzajWsparcia || undefined,
        wTymWsparcia: f.wTymWsparcia || undefined,
        dataRozpoczeciaWsparcia: f.dataRozpoczeciaWsparcia || undefined,
        dataZalozeniaDG: f.dataZalozeniaDG || undefined,
        osobaObcegoPochodzenia: f.osobaObcegoPochodzenia as "Tak" | "Nie",
        obywatelPanstwaTrzeciego: f.obywatelPanstwaTrzeciego as "Tak" | "Nie",
        mniejszosc: f.mniejszosc as "Tak" | "Nie",
        bezdomnosc: f.bezdomnosc as "Tak" | "Nie",
        niepelnosprawnosc: f.niepelnosprawnosc || undefined,
        uwagi: f.uwagi || undefined,
      },
    };
    onSave(u);
    onClose();
  }

  const wp = f.pesel.length === 11 ? walidujPesel(f.pesel) : null;
  const wiekHint =
    wp?.poprawny && wp.dataUrodzenia
      ? wiekWDniu(
          wp.dataUrodzenia,
          f.dataPrzystapienia || new Date().toISOString().slice(0, 10),
        )
      : null;

  // powiaty zależne od wybranego województwa; zachowaj istniejącą wartość
  // (np. z importu), nawet jeśli nie ma jej w słowniku
  const powiatyBaza = powiatyDlaWojewodztwa(f.wojewodztwo);
  const powiatyOpcje =
    f.powiat && !powiatyBaza.includes(f.powiat)
      ? [...powiatyBaza, f.powiat]
      : powiatyBaza;

  const Pole = ({
    label,
    klucz,
    hint,
    szeroki,
    typ,
  }: {
    label: string;
    klucz: keyof typeof f;
    hint?: string;
    szeroki?: boolean;
    typ?: string;
  }) => (
    <div className={szeroki ? "sm:col-span-2" : ""}>
      <label className="th-label mb-1 block">{label}</label>
      <input
        type={typ ?? "text"}
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
    szeroki = true,
    placeholder = "— wybierz ze słownika —",
    przyZmianie,
    wylaczony,
  }: {
    label: string;
    klucz: keyof typeof f;
    opcje: readonly string[];
    szeroki?: boolean;
    placeholder?: string;
    przyZmianie?: (v: string) => void;
    wylaczony?: boolean;
  }) => (
    <div className={szeroki ? "sm:col-span-2" : ""}>
      <label className="th-label mb-1 block">{label}</label>
      <select
        value={f[klucz]}
        disabled={wylaczony}
        onChange={(e) => {
          set(klucz)(e.target.value);
          przyZmianie?.(e.target.value);
        }}
        className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-sm text-ink outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
          bledy[klucz]
            ? "border-red-ink bg-red-soft/40"
            : "border-line-strong bg-surface"
        }`}
      >
        <option value="">{placeholder}</option>
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
        className="anim-pop card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
            {edytowany ? "Edytuj uczestnika" : "Nowy uczestnik"}
          </h3>
          <button
            onClick={onClose}
            className="text-faint hover:text-ink"
            title="Zamknij"
          >
            <span className="material-symbols-rounded notranslate text-[22px]">close</span>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3.5 overflow-y-auto px-6 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl bg-soft px-4 py-3">
            <div className="font-semibold text-ink-strong">Dane podstawowe SOWA</div>
            <div className="mt-1 text-xs text-muted">
              Numer projektu oraz pola systemowe dodania/modyfikacji uzupełnia aplikacja i SOWA.
            </div>
          </div>
          {Slownik({
            label: "Rodzaj uczestnika *",
            klucz: "rodzajUczestnika",
            opcje: RODZAJE_UCZESTNIKA,
            szeroki: false,
          })}
          {Pole({
            label: "Nazwa instytucji (dla uczestnika instytucjonalnego)",
            klucz: "nazwaInstytucji",
          })}
          {Pole({ label: "Imię *", klucz: "imie" })}
          {Pole({ label: "Nazwisko *", klucz: "nazwisko" })}
          {Slownik({
            label: "Brak PESEL *",
            klucz: "brakPesel",
            opcje: SLOWNIK_TAK_NIE,
            szeroki: false,
          })}
          {Pole({
            label: "Techniczny identyfikator (zwykle puste dla nowej osoby)",
            klucz: "technicznyId",
          })}
          <div className="sm:col-span-2">
            <label className="th-label mb-1 block">
              PESEL / inny identyfikator {f.brakPesel === "Tak" ? "" : "*"}
            </label>
            <input
              value={f.pesel}
              disabled={f.brakPesel === "Tak"}
              onChange={(e) =>
                set("pesel")(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="11 cyfr — płeć i data urodzenia rozpoznawane automatycznie"
              className={`w-full rounded-xl border px-3 py-2 font-mono text-sm text-ink outline-none disabled:opacity-50 ${
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
                {wiekHint != null && ` · ${wiekHint} l.`}
              </p>
            )}
          </div>
          {Slownik({
            label: "Obywatelstwo *",
            klucz: "obywatelstwo",
            opcje: SLOWNIK_OBYWATELSTWO,
          })}
          {Slownik({
            label: "Wykształcenie (słownik ISCED) *",
            klucz: "wyksztalcenie",
            opcje: SLOWNIK_WYKSZTALCENIE,
          })}
          {Slownik({
            label: "Status na rynku pracy *",
            klucz: "statusRynkuPracy",
            opcje: SLOWNIK_STATUS_RYNKU_PRACY,
            przyZmianie: (v) =>
              set("wTymStatus")(SLOWNIK_W_TYM[v]?.[0] ?? ""),
          })}
          {Slownik({
            label: "W tym — szczegół statusu",
            klucz: "wTymStatus",
            opcje: SLOWNIK_W_TYM[f.statusRynkuPracy] ?? [],
            wylaczony: !f.statusRynkuPracy,
          })}

          <div className="sm:col-span-2 mt-2 rounded-xl bg-soft px-4 py-3 font-semibold text-ink-strong">
            Adres i kontakt
          </div>
          {Pole({ label: "Kraj *", klucz: "kraj" })}
          {Slownik({
            label: "Województwo *",
            klucz: "wojewodztwo",
            opcje: SLOWNIK_WOJEWODZTWA,
            szeroki: false,
            przyZmianie: () => set("powiat")(""),
          })}
          {Slownik({
            label: "Powiat *",
            klucz: "powiat",
            opcje: powiatyOpcje,
            szeroki: false,
            wylaczony: !f.wojewodztwo,
            placeholder: f.wojewodztwo
              ? "— wybierz powiat —"
              : "— najpierw wybierz województwo —",
          })}
          {Pole({ label: "Gmina (TERYT) *", klucz: "gmina" })}
          {Pole({ label: "Miejscowość (TERYT) *", klucz: "miejscowosc" })}
          {Pole({ label: "Ulica", klucz: "ulica" })}
          {Pole({ label: "Numer domu", klucz: "nrDomu" })}
          {Pole({ label: "Numer lokalu", klucz: "nrLokalu" })}
          {Pole({ label: "Kod pocztowy *", klucz: "kodPocztowy", hint: "00-000" })}
          {Slownik({
            label: "DEGURBA * (1 — gęsty, 2 — pośredni, 3 — wiejski)",
            klucz: "degurba",
            opcje: DEGURBA,
            szeroki: false,
          })}
          {Pole({ label: "Telefon kontaktowy *", klucz: "telefon" })}
          {Pole({
            label: "Adres e-mail *",
            klucz: "email",
            hint: "bez polskich znaków",
          })}

          <div className="sm:col-span-2 mt-2 rounded-xl bg-soft px-4 py-3 font-semibold text-ink-strong">
            Udział w projekcie
          </div>
          {Slownik({
            label: "Status udziału w projekcie *",
            klucz: "status",
            opcje: STATUSY_UDZIALU,
          })}
          {Pole({
            label: "Data rozpoczęcia udziału w projekcie *",
            klucz: "dataPrzystapienia",
            typ: "date",
          })}
          {Pole({
            label: "Data zakończenia udziału w projekcie",
            klucz: "dataZakonczeniaUdzialu",
            typ: "date",
          })}
          {Pole({
            label: "Planowana data zakończenia edukacji",
            klucz: "planowanaDataZakonczeniaEdukacji",
            typ: "date",
          })}
          {Pole({
            label: "Sytuacja po zakończeniu udziału",
            klucz: "sytuacjaPoZakonczeniu",
          })}
          {Pole({
            label: "Zakończenie zgodne ze ścieżką",
            klucz: "zakonczenieZgodneZeSciezka",
          })}
          {Pole({ label: "Grupa", klucz: "grupa", hint: "np. A" })}
          {Slownik({
            label: "Cykl",
            klucz: "cykl",
            opcje: ["1", "2"],
            szeroki: false,
          })}

          <div className="sm:col-span-2 mt-2 rounded-xl bg-soft px-4 py-3 font-semibold text-ink-strong">
            Zakres i rodzaj wsparcia
          </div>
          {Pole({
            label: "Zakres wsparcia *",
            klucz: "zakresWsparcia",
            hint: "dokładna wartość słownikowa SOWA",
            szeroki: true,
          })}
          {Pole({
            label: "Rodzaj przyznanego wsparcia *",
            klucz: "rodzajWsparcia",
            hint: "np. doradztwo/konsultacje",
          })}
          {Pole({ label: "W tym — wsparcia *", klucz: "wTymWsparcia", hint: "np. inne" })}
          {Pole({
            label: "Data rozpoczęcia udziału we wsparciu *",
            klucz: "dataRozpoczeciaWsparcia",
            typ: "date",
          })}
          {Pole({ label: "Data założenia działalności gospodarczej", klucz: "dataZalozeniaDG", typ: "date" })}

          <div className="sm:col-span-2 mt-2 rounded-xl bg-soft px-4 py-3 font-semibold text-ink-strong">
            Dane wrażliwe i wskaźniki SOWA
          </div>
          {Slownik({ label: "Osoba obcego pochodzenia *", klucz: "osobaObcegoPochodzenia", opcje: SLOWNIK_TAK_NIE, szeroki: false })}
          {Slownik({ label: "Obywatel państwa trzeciego *", klucz: "obywatelPanstwaTrzeciego", opcje: SLOWNIK_TAK_NIE, szeroki: false })}
          {Slownik({ label: "Przynależność do mniejszości *", klucz: "mniejszosc", opcje: SLOWNIK_TAK_NIE, szeroki: false })}
          {Slownik({ label: "Bezdomność lub wykluczenie mieszkaniowe *", klucz: "bezdomnosc", opcje: SLOWNIK_TAK_NIE, szeroki: false })}
          {Pole({ label: "Niepełnosprawność *", klucz: "niepelnosprawnosc", hint: "Nie / Tak / kod stopnia" })}
          {Pole({ label: "Uwagi", klucz: "uwagi", szeroki: true })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            Formularz odpowiada kolumnom Import CSV SOWA. Płeć i wiek są
            wyliczane z PESEL, a numer projektu i pola systemowe — automatycznie.
          </span>
          <button onClick={zapisz} className="btn-primary">
            <span className="material-symbols-rounded notranslate text-[19px]">
              {edytowany ? "save" : "person_add"}
            </span>
            {edytowany ? "Zapisz zmiany" : "Dodaj uczestnika"}
          </button>
        </div>
      </div>
    </div>
  );
}
