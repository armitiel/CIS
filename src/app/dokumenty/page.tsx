"use client";

// Moduł Dokumenty — perspektywa PROJEKTOWA: specyfikacja i katalog formularzy,
// generowanie zbiorcze (ZIP), akcje dla wybranej osoby oraz szablony własne.
// Pełna teczka pojedynczego uczestnika jest w jego kartotece (moduł Uczestnicy).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import {
  brakiWTeczce,
  nazwaSekcji,
  wymaganeDokumenty,
  type Sekcja,
  type WymaganyDokument,
} from "@/lib/projekt-spec";
import {
  dokumentBlob,
  dokumentPodgladowy,
  generujListeDzienna,
  generujListeObecnosci,
  generujPakiet,
  generujPakietyZbiorczo,
  uczestnikWzor,
  ustawBrandingStopki,
  type DzienListy,
} from "@/lib/generator";
import { useObecnosci } from "@/lib/use-obecnosci";
import { czyL4, kodObecnosci, type KodObecnosci } from "@/lib/oznaczenia-obecnosci";
import { podzielL4 } from "@/lib/swiadczenia-l4";
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
import {
  listaDokumentow,
  pobierzDokument,
  storageDostepny,
  usunDokument,
  wgrajDokument,
  type DokumentProjektu,
} from "@/lib/db-dokumenty-projektu";
import {
  listaLogo,
  pobierzBrandingFinalny,
  usunLogo,
  wgrajLogo,
  type LogoProjektu,
} from "@/lib/db-logo-projektu";
import { wykryjZestaw, type RolaLogo } from "@/lib/logotypy";
import {
  maWzorEdytowalny,
  plikWbudowanegoWzoru,
  surowySzablonDokumentu,
} from "@/lib/wzory"; // edytowalne szablony + „Otwórz w Wordzie"
import {
  maNadpisanie,
  usunNadpisanie,
  zapiszNadpisanie,
} from "@/lib/szablony-dokumentow";
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
  const { znak, wpisy } = useObecnosci(projekt.id);

  // ---- Listy obecności (dane z apki → pomocniczy druk operacyjny) ----
  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
  const dokDzienny = spec.dokumenty.find((d) => d.id === "c-01");
  const zeSwiadczeniami =
    !!dokDzienny &&
    /świadcz|wy[żz]yw|transport|posi[łl]|dojazd/i.test(
      `${dokDzienny.nazwa} ${dokDzienny.opis}`,
    );
  const kolumnyDzienne = zeSwiadczeniami ? ["Wyżywienie", "Transport"] : [];
  const [dataListy, setDataListy] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [genListaDzien, setGenListaDzien] = useState(false);
  const [genListaMies, setGenListaMies] = useState(false);

  const MIES_M = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
  ];
  const znakLitera = (
    uId: string,
    isoD: string,
  ): KodObecnosci => kodObecnosci(znak(uId, isoD));

  // Agregaty obecności per uczestnik za miesiąc z pola daty — do podstawienia
  // w szablonach ({{frekwencja}}, {{dni_obecny}}, {{dni_wsparcia}}…).
  function agregatyObecnosci(u: Uczestnik): Record<string, string> {
    const [rok, mc] = dataListy.split("-").map(Number);
    let p = 0;
    let a = 0;
    let l4 = 0;
    let dw = 0;
    const d = new Date(rok, mc - 1, 1);
    while (d.getMonth() === mc - 1) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        const z = znak(u.id, d.toISOString().slice(0, 10));
        if (z === "p") p++;
        else if (z === "a") a++;
        else if (z && czyL4(z)) {
          l4++;
        }
        else if (z === "w") dw++;
      }
      d.setDate(d.getDate() + 1);
    }
    const podstawa = p + a + l4 + dw;
    const frek = podstawa > 0 ? `${Math.round((p / podstawa) * 100)}%` : "—";
    const pierwszyIso = `${rok}-${String(mc).padStart(2, "0")}-01`;
    const ostatniDzien = new Date(rok, mc, 0).getDate();
    const ostatniIso = `${rok}-${String(mc).padStart(2, "0")}-${ostatniDzien}`;
    const podzialL4 = podzielL4(wpisy(u.id), pierwszyIso, ostatniIso);
    return {
      frekwencja: frek,
      dni_obecny: String(p),
      dni_nieobecny: String(a),
      dni_l4: String(l4),
      dni_l4_do21: String(podzialL4.l4Do21),
      dni_l4_ponad21: String(podzialL4.l4Ponad21),
      dni_wolne: String(dw),
      dni_wsparcia: String(p),
      okres_obecnosci: `${MIES_M[mc - 1]} ${rok}`,
    };
  }

  async function listaDzien() {
    setGenListaDzien(true);
    try {
      await generujListeDzienna(spec, aktywni, {
        tytul: dokDzienny?.nazwa ?? "Lista obecności (dzienna)",
        podtytul: `${projekt.nazwa} (${projekt.nabor})`,
        dataLabel: dataListy.split("-").reverse().join("."),
        kolumny: kolumnyDzienne,
        znakDla: (uId) => znakLitera(uId, dataListy),
      });
    } finally {
      setGenListaDzien(false);
    }
  }

  async function listaMiesiac() {
    setGenListaMies(true);
    try {
      const [rok, mc] = dataListy.split("-").map(Number);
      const dni: DzienListy[] = [];
      const d = new Date(rok, mc - 1, 1);
      while (d.getMonth() === mc - 1) {
        const dow = d.getDay();
        if (dow >= 1 && dow <= 5) {
          dni.push({
            iso: d.toISOString().slice(0, 10),
            etykieta: String(d.getDate()),
          });
        }
        d.setDate(d.getDate() + 1);
      }
      await generujListeObecnosci(spec, aktywni, dni, znakLitera, {
        tytul: `Lista obecności (miesięczna) — ${MIES_M[mc - 1]} ${rok}`,
        podtytul: `${projekt.nazwa} (${projekt.nabor})`,
      });
    } finally {
      setGenListaMies(false);
    }
  }

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
  const [pobieraWzor, setPobieraWzor] = useState<string | null>(null);
  const [otwieraSzablon, setOtwieraSzablon] = useState<string | null>(null);
  // licznik wymuszający odświeżenie po wgraniu/przywróceniu szablonu (czyta localStorage)
  const [wersjaSzablonow, setWersjaSzablonow] = useState(0);
  const szablonDokRef = useRef<HTMLInputElement>(null);
  const wgrywamSzablonDla = useRef<WymaganyDokument | null>(null);
  const [skopiowany, setSkopiowany] = useState<string | null>(null);
  const [wyborSzablonu, setWyborSzablonu] = useState<SzablonZapisany | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const szablonRef = useRef<HTMLInputElement>(null);
  const dokRef = useRef<HTMLInputElement>(null);

  // Współdzielone dokumenty projektu (Supabase Storage)
  const [storageOK, setStorageOK] = useState<boolean | null>(null);
  const [dokProjektu, setDokProjektu] = useState<DokumentProjektu[]>([]);
  const [ladujeDok, setLadujeDok] = useState(false);
  const [wgrywaDok, setWgrywaDok] = useState(false);
  const [bladDok, setBladDok] = useState<string | null>(null);

  // Logotypy projektu (wizualizacja)
  const zestaw = wykryjZestaw(projekt.nabor);
  const [logo, setLogo] = useState<LogoProjektu[]>([]);
  const [wgrywaLogo, setWgrywaLogo] = useState<RolaLogo | null>(null);
  const aktywnaRola = useRef<RolaLogo | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSzablony(wczytajSzablony(projekt.id));
  }, [projekt.id]);

  const odswiezDokumenty = useCallback(async () => {
    setBladDok(null);
    const ok = await storageDostepny();
    setStorageOK(ok);
    if (!ok) {
      setDokProjektu([]);
      return;
    }
    setLadujeDok(true);
    try {
      setDokProjektu(await listaDokumentow(projekt.id));
    } catch (e) {
      setBladDok(
        e instanceof Error
          ? `Nie udało się wczytać dokumentów: ${e.message}. Sprawdź, czy w Supabase istnieje bucket „dokumenty-projektu”.`
          : "Nie udało się wczytać dokumentów.",
      );
    } finally {
      setLadujeDok(false);
    }
    try {
      setLogo(await listaLogo(projekt.id));
    } catch {
      setLogo([]);
    }
  }, [projekt.id]);

  // Branding stopki: domyślny zestaw programu (public/), nadpisany własnymi
  // logotypami projektu, jeśli zostały wgrane. Działa też bez logowania.
  const odswiezBranding = useCallback(async () => {
    const zest = wykryjZestaw(projekt.nabor);
    ustawBrandingStopki(await pobierzBrandingFinalny(projekt.id, zest));
  }, [projekt.id, projekt.nabor]);

  useEffect(() => {
    void odswiezBranding();
  }, [odswiezBranding]);

  async function wgrajLogoPlik(file: File | undefined) {
    const rola = aktywnaRola.current;
    if (!file || !rola) return;
    setWgrywaLogo(rola);
    setBladDok(null);
    try {
      await wgrajLogo(projekt.id, rola, file);
      setLogo(await listaLogo(projekt.id));
      await odswiezBranding();
    } catch (e) {
      setBladDok(e instanceof Error ? e.message : "Nie udało się wgrać logo.");
    } finally {
      setWgrywaLogo(null);
      aktywnaRola.current = null;
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  function wybierzLogo(rola: RolaLogo) {
    aktywnaRola.current = rola;
    logoRef.current?.click();
  }

  async function usunLogoSlot(l: LogoProjektu) {
    if (!window.confirm(`Usunąć logo „${l.nazwa}”?`)) return;
    try {
      await usunLogo(l.sciezka);
      setLogo(await listaLogo(projekt.id));
      await odswiezBranding();
    } catch (e) {
      setBladDok(e instanceof Error ? e.message : "Nie udało się usunąć logo.");
    }
  }

  const logoWgRoli = (rola: RolaLogo) => logo.find((l) => l.rola === rola);

  /** Podgląd układu dokumentu z aktualnymi logotypami w stopce. */
  async function podgladDokumentu() {
    setBladDok(null);
    try {
      await odswiezBranding();
      const blob = await dokumentPodgladowy(spec);
      setPodglad({
        tytul: `Podgląd dokumentu — stopka z logotypami (${zestaw.skrot})`,
        blob,
      });
    } catch (e) {
      setBladDok(
        e instanceof Error ? e.message : "Nie udało się utworzyć podglądu.",
      );
    }
  }

  useEffect(() => {
    void odswiezDokumenty();
  }, [odswiezDokumenty]);

  async function wgrajPlik(file: File | undefined) {
    if (!file) return;
    setWgrywaDok(true);
    setBladDok(null);
    try {
      await wgrajDokument(projekt.id, file);
      await odswiezDokumenty();
    } catch (e) {
      setBladDok(
        e instanceof Error ? e.message : "Nie udało się wgrać pliku.",
      );
    } finally {
      setWgrywaDok(false);
      if (dokRef.current) dokRef.current.value = "";
    }
  }

  async function pobierzPlik(d: DokumentProjektu) {
    try {
      const blob = await pobierzDokument(d.sciezka);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.nazwa;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setBladDok(e instanceof Error ? e.message : "Nie udało się pobrać pliku.");
    }
  }

  async function usunPlik(d: DokumentProjektu) {
    if (!window.confirm(`Usunąć dokument „${d.nazwa}” z projektu?`)) return;
    try {
      await usunDokument(d.sciezka);
      await odswiezDokumenty();
    } catch (e) {
      setBladDok(e instanceof Error ? e.message : "Nie udało się usunąć pliku.");
    }
  }

  const fmtRozmiar = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1024 * 1024
        ? `${Math.round(b / 1024)} KB`
        : `${(b / (1024 * 1024)).toFixed(1)} MB`;

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
          `✓ Wygenerowano ${tylkoBraki ? "pakiet braków" : "komplet"} (.zip) dla: ${u.nazwisko} ${u.imie}.`,
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
        agregatyObecnosci,
      );
      setKomunikat(
        `✓ Wygenerowano „${s.nazwa}” dla ${aktywni.length} aktywnych uczestników (ZIP). Pola obecności liczone za ${MIES_M[Number(dataListy.split("-")[1]) - 1]}.`,
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
          agregatyObecnosci,
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
          agregatyObecnosci,
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
      if (plikWbudowanegoWzoru(spec, d)?.toLowerCase().endsWith(".xlsx")) {
        setKomunikat(
          `${d.symbol} jest skoroszytem Excel. Pobierz go przyciskiem ze strzałką.`,
        );
        return;
      }
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

  /** Pobiera wzór formularza (.docx, pola puste) dla pojedynczego dokumentu. */
  async function pobierzWzor(d: WymaganyDokument) {
    setPobieraWzor(d.id);
    try {
      const plik = plikWbudowanegoWzoru(spec, d);
      const arkusz = plik?.toLowerCase().endsWith(".xlsx") ?? false;
      let blob: Blob;
      if (arkusz) {
        const surowy = await surowySzablonDokumentu(spec, d);
        if (!surowy) throw new Error(`Brak skoroszytu ${d.symbol}.`);
        blob = new Blob([surowy], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        blob = await dokumentBlob(d, uczestnikWzor(d.dotyczy), spec);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.symbol}_wzor.${arkusz ? "xlsx" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setKomunikat(
        `Błąd pobierania: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    } finally {
      setPobieraWzor(null);
    }
  }

  /**
   * „Otwórz w Wordzie": pobiera SUROWY szablon dokumentu ze znacznikami
   * {{pole}} (nadpisanie kadry lub wzór wbudowany) — do edycji treści bez
   * utraty pól dynamicznych. Po edycji wgrywa się go z powrotem.
   */
  async function otworzSzablonWWordzie(d: WymaganyDokument) {
    setOtwieraSzablon(d.id);
    try {
      const ab = await surowySzablonDokumentu(spec, d);
      if (!ab) {
        setKomunikat(
          `Dokument ${d.symbol} nie ma jeszcze edytowalnego szablonu .docx.`,
        );
        return;
      }
      const arkusz =
        plikWbudowanegoWzoru(spec, d)?.toLowerCase().endsWith(".xlsx") ??
        false;
      const blob = new Blob([ab], {
        type: arkusz
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.symbol}_szablon.${arkusz ? "xlsx" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
      setKomunikat(
        arkusz
          ? `Pobrano skoroszyt ${d.symbol}.`
          : `Pobrano szablon ${d.symbol}. Zmień treść w Wordzie, zostaw znaczniki {{…}}, zapisz i wgraj z powrotem („Wgraj zmieniony”).`,
      );
    } catch (e) {
      setKomunikat(
        `Błąd otwierania szablonu: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    } finally {
      setOtwieraSzablon(null);
    }
  }

  /** Otwiera systemowy wybór pliku dla wgrania zmienionego szablonu dokumentu. */
  function wybierzZmienionySzablon(d: WymaganyDokument) {
    wgrywamSzablonDla.current = d;
    szablonDokRef.current?.click();
  }

  /** Zapisuje wgrany przez kadrę szablon jako nadpisanie danego dokumentu. */
  async function wgrajZmienionySzablon(file: File | undefined) {
    const d = wgrywamSzablonDla.current;
    if (szablonDokRef.current) szablonDokRef.current.value = "";
    if (!file || !d) return;
    const arkusz =
      plikWbudowanegoWzoru(spec, d)?.toLowerCase().endsWith(".xlsx") ?? false;
    const poprawneRozszerzenie = arkusz
      ? /\.xlsx$/i.test(file.name)
      : /\.docx$/i.test(file.name);
    if (!poprawneRozszerzenie) {
      setKomunikat(
        arkusz
          ? "Szablon musi być plikiem .xlsx."
          : "Szablon musi być plikiem .docx ze znacznikami {{pole}}.",
      );
      return;
    }
    try {
      const ab = await file.arrayBuffer();
      zapiszNadpisanie(spec.id, d.id, file.name, ab);
      setWersjaSzablonow((v) => v + 1);
      setKomunikat(
        `✓ Zapisano własny szablon dla ${d.symbol}. Od teraz dokument generuje się z tej wersji.`,
      );
    } catch (e) {
      setKomunikat(
        `Błąd wgrywania: ${e instanceof Error ? e.message : "nieznany"}`,
      );
    }
  }

  /** Przywraca dokument do wzoru wbudowanego / treści z kodu (usuwa nadpisanie). */
  function przywrocWzor(d: WymaganyDokument) {
    usunNadpisanie(spec.id, d.id);
    setWersjaSzablonow((v) => v + 1);
    setKomunikat(`Przywrócono domyślny wzór dla ${d.symbol}.`);
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
              wniosku służy tylko do potwierdzenia zgodności (numer naboru /
              tytuł) — dla projektów wbudowanych nie zmienia danych; dane
              nadpisuje wyłącznie w projektach własnych.
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
            {/* ukryty input: wgranie zmienionego szablonu dla konkretnego dokumentu */}
            <input
              ref={szablonDokRef}
              type="file"
              accept=".docx,.xlsx"
              className="hidden"
              onChange={(e) => wgrajZmienionySzablon(e.target.files?.[0])}
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
                <span>{nazwaSekcji(spec, sekcja)}</span>
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
                              ? "bezrobotni"
                              : "bierni zawodowo"}
                          </span>
                        )}
                      </div>
                      <div
                        key={`akcje-${d.id}-${wersjaSzablonow}`}
                        className="flex flex-wrap items-center gap-1.5 sm:w-[150px] sm:shrink-0 sm:justify-end"
                      >
                        <button
                          onClick={() => pokazPodgladWzoru(d)}
                          disabled={podgladLaduje !== null}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-mid hover:bg-soft disabled:opacity-50 sm:flex-none sm:py-1"
                          title="Podgląd wzoru formularza (pola puste)"
                        >
                          <span className="material-symbols-rounded notranslate text-[16px]">
                            visibility
                          </span>
                          {podgladLaduje === `wzor:${d.id}` ? "…" : "Podgląd"}
                        </button>
                        <button
                          onClick={() => pobierzWzor(d)}
                          disabled={pobieraWzor !== null}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line-strong px-2 py-1.5 text-xs font-medium text-primary-strong hover:bg-green-soft disabled:opacity-50 sm:py-1"
                          title="Pobierz wzór wypełniony (pola puste, ze stopką)"
                        >
                          <span className="material-symbols-rounded notranslate text-[17px]">
                            {pobieraWzor === d.id ? "hourglass_empty" : "download"}
                          </span>
                        </button>
                        {maWzorEdytowalny(spec, d) && (
                          <>
                            <button
                              onClick={() => otworzSzablonWWordzie(d)}
                              disabled={otwieraSzablon !== null}
                              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-line-strong px-2 py-1.5 text-xs font-medium text-blue-ink hover:bg-blue-soft disabled:opacity-50 sm:py-1"
                              title="Otwórz szablon w Wordzie — zmień treść, zostaw znaczniki {{…}}"
                            >
                              <span className="material-symbols-rounded notranslate text-[16px]">
                                {otwieraSzablon === d.id
                                  ? "hourglass_empty"
                                  : plikWbudowanegoWzoru(spec, d)
                                        ?.toLowerCase()
                                        .endsWith(".xlsx")
                                    ? "table_view"
                                    : "edit_document"}
                              </span>
                              <span className="hidden sm:inline">
                                {plikWbudowanegoWzoru(spec, d)
                                  ?.toLowerCase()
                                  .endsWith(".xlsx")
                                  ? "Excel"
                                  : "Word"}
                              </span>
                            </button>
                            <button
                              onClick={() => wybierzZmienionySzablon(d)}
                              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line-strong px-2 py-1.5 text-xs font-medium text-ink-mid hover:bg-soft sm:py-1"
                              title="Wgraj zmieniony szablon (.docx) — zastąpi domyślny wzór"
                            >
                              <span className="material-symbols-rounded notranslate text-[16px]">
                                upload
                              </span>
                            </button>
                          </>
                        )}
                        {maNadpisanie(spec.id, d.id) && (
                          <div className="flex w-full items-center justify-end gap-1.5">
                            <span
                              className="inline-flex items-center gap-0.5 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-amber-ink"
                              title="Dokument używa Twojego wgranego szablonu zamiast domyślnego"
                            >
                              <span className="material-symbols-rounded notranslate text-[13px]">
                                star
                              </span>
                              własny szablon
                            </span>
                            <button
                              onClick={() => przywrocWzor(d)}
                              className="text-[11px] font-medium text-faint underline hover:text-ink-mid"
                              title="Przywróć domyślny wzór / treść z aplikacji"
                            >
                              przywróć
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Formularze są generowane bezpośrednio z aktualnych wzorów DOCX/XLSX;
          aplikacja zachowuje ich układ, style, nagłówki, stopki i logotypy.
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

      {/* Listy zbiorcze z danymi projektu (obecność) */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.16s" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              Listy obecności (z danymi z projektu)
            </h2>
            <p className="m-0 mt-[5px] max-w-2xl text-[13.5px] text-muted">
              Druk wypełniony danymi z apki: uczestnicy ({aktywni.length}{" "}
              aktywnych) i znaki obecności O/NN/L4≤21/L4&gt;21/DW z modułu Obecności.
              {zeSwiadczeniami &&
                " Wzór tego projektu obejmuje świadczenia — dochodzą kolumny „Wyżywienie” i „Transport”."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dataListy}
              onChange={(e) => setDataListy(e.target.value)}
              title="Dzień (i miesiąc) listy obecności"
              className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none"
            />
            <button
              onClick={listaDzien}
              disabled={genListaDzien || aktywni.length === 0}
              className="btn-dark disabled:opacity-50"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                today
              </span>
              {genListaDzien ? "Generuję…" : "Lista dnia (.docx)"}
            </button>
            <button
              onClick={listaMiesiac}
              disabled={genListaMies || aktywni.length === 0}
              className="btn-dark disabled:opacity-50"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                calendar_view_month
              </span>
              {genListaMies ? "Generuję…" : "Lista miesiąca (.docx)"}
            </button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
          <span className="material-symbols-rounded notranslate text-base text-blue-ink">
            info
          </span>
          {dokDzienny
            ? `Tytuł i kolumny dopasowane do wzoru z katalogu: „${dokDzienny.nazwa}”. `
            : "Lista robocza generowana z danych aplikacji; formularz C-01 nie jest częścią aktualnego katalogu. "}
          Logotypy projektu są w stopce. Dane pochodzą z modułów Uczestnicy i
          Obecności.
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
              — aplikacja wypełni go danymi każdego uczestnika. W pakiecie
              zbiorczym (ZIP) każdy dostaje swoje wartości, także{" "}
              <strong>agregaty z obecności</strong> ({"{{frekwencja}}"},{" "}
              {"{{dni_obecny}}"}, {"{{dni_wsparcia}}"}…) liczone za miesiąc
              wybrany w sekcji „Listy obecności" powyżej.
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

      {/* KROK 4: współdzielone dokumenty projektu (Supabase Storage) */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
              4. Dokumenty projektu (współdzielone)
            </h2>
            <p className="m-0 mt-[5px] max-w-2xl text-[13.5px] text-muted">
              Pliki referencyjne projektu — regulaminy, wzory umów, decyzje,
              procedury, skany. Przechowywane w chmurze (Supabase Storage),
              dostępne z każdego urządzenia po zalogowaniu. Bez ograniczenia
              5 MB; nie wgrywaj dokumentów z danymi osobowymi w nazwie pliku.
            </p>
          </div>
          {storageOK && (
            <div>
              <input
                ref={dokRef}
                type="file"
                className="hidden"
                onChange={(e) => wgrajPlik(e.target.files?.[0])}
              />
              <button
                onClick={() => dokRef.current?.click()}
                disabled={wgrywaDok}
                className="btn-primary"
              >
                <span className="material-symbols-rounded notranslate text-[19px]">
                  upload_file
                </span>
                {wgrywaDok ? "Wgrywam…" : "Wgraj dokument"}
              </button>
            </div>
          )}
        </div>

        {storageOK === false && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-soft px-4 py-3 text-sm text-ink-mid">
            <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-blue-ink">
              info
            </span>
            <span>
              Współdzielone dokumenty wymagają zalogowania (baza online).
              Zaloguj się, aby wgrywać i pobierać pliki projektu z chmury.
            </span>
          </div>
        )}

        {bladDok && (
          <div className="anim-fade-in mt-4 rounded-xl bg-red-soft px-4 py-3 text-sm text-red-ink">
            {bladDok}
          </div>
        )}

        {storageOK && (
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            {ladujeDok ? (
              <div className="px-4 py-6 text-center text-sm text-faint">
                Wczytuję dokumenty…
              </div>
            ) : dokProjektu.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-faint">
                Brak dokumentów w tym projekcie. Wgraj pierwszy plik powyżej.
              </div>
            ) : (
              <div className="divide-y divide-line-soft">
                {dokProjektu.map((d) => (
                  <div
                    key={d.sciezka}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover-row"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-soft text-blue-ink">
                      <span className="material-symbols-rounded notranslate text-[20px]">
                        description
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-semibold text-ink">
                        {d.nazwa}
                      </p>
                      <p className="m-0 text-xs text-faint">
                        {fmtRozmiar(d.rozmiar)}
                        {d.dodano && ` · ${d.dodano.slice(0, 10)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => pobierzPlik(d)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-strong hover:bg-green-soft"
                      title="Pobierz"
                    >
                      <span className="material-symbols-rounded notranslate text-[20px]">
                        download
                      </span>
                    </button>
                    <button
                      onClick={() => usunPlik(d)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint hover:text-red-ink"
                      title="Usuń"
                    >
                      <span className="material-symbols-rounded notranslate text-[20px]">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* KROK 5: wizualizacja projektu — logotypy (biblioteka per projekt) */}
      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.4s" }}
      >
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => wgrajLogoPlik(e.target.files?.[0])}
        />
        <h2 className="m-0 font-serif text-xl font-semibold text-ink-strong">
          5. Wizualizacja projektu (logotypy)
        </h2>
        <p className="m-0 mt-[5px] max-w-2xl text-[13.5px] text-muted">
          Zestaw obowiązkowych znaków wykryty z numeru naboru. Domyślnie
          używany jest wbudowany pasek programu (nadruk w stopce dokumentów z
          katalogu). Aby nadpisać go dla tego projektu — wgraj własne pliki
          (PNG/JPG) do slotów poniżej: seria znaków + logo partnera, równa
          wysokość. Wgranie czegokolwiek zastępuje zestaw domyślny.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-soft px-4 py-3 text-[13px]">
          <span className="rounded-full bg-green-soft px-2.5 py-1 text-xs font-bold text-primary-strong">
            {zestaw.skrot}
          </span>
          <span className="text-ink-mid">{zestaw.program}</span>
          <a
            href={zestaw.zrodloUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
          >
            <span className="material-symbols-rounded notranslate text-[16px]">
              open_in_new
            </span>
            oficjalne znaki
          </a>
        </div>

        <div className="mt-3">
          <button
            onClick={podgladDokumentu}
            disabled={podgladLaduje !== null}
            className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-mid transition-colors hover:bg-soft"
            title="Zobacz, jak logotypy wyglądają w stopce dokumentu"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              visibility
            </span>
            Podgląd dokumentu (stopka z logotypami)
          </button>
        </div>

        {storageOK === false ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-soft px-4 py-3 text-sm text-ink-mid">
            <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-blue-ink">
              info
            </span>
            <span>
              Wgrywanie logotypów wymaga zalogowania (baza online). Zaloguj się,
              aby zbudować bibliotekę znaków projektu.
            </span>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {zestaw.sloty.map((slot) => {
              const l = logoWgRoli(slot.rola);
              const domyslny = zestaw.domyslneZnaki?.[slot.rola];
              const podgladSrc = l?.url ?? domyslny;
              return (
                <div
                  key={slot.rola}
                  className="flex items-center gap-3 rounded-xl border border-line p-3"
                >
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-soft bg-white">
                    {podgladSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={podgladSrc}
                        alt={slot.nazwa}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="material-symbols-rounded notranslate text-[24px] text-faint">
                        image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {slot.nazwa}
                      {slot.obowiazkowy && (
                        <span className="rounded bg-amber-soft px-1.5 py-px text-[10px] font-bold text-amber-ink">
                          wymagany
                        </span>
                      )}
                    </p>
                    <p className="m-0 mt-0.5 flex items-center gap-1.5 truncate text-xs text-faint">
                      {l ? (
                        l.nazwa
                      ) : domyslny ? (
                        <span className="rounded bg-green-soft px-1.5 py-px text-[10px] font-bold text-primary-strong">
                          znak domyślny
                        </span>
                      ) : (
                        "brak pliku"
                      )}
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      <button
                        onClick={() => wybierzLogo(slot.rola)}
                        disabled={wgrywaLogo !== null}
                        className="rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink-mid hover:bg-soft disabled:opacity-50"
                      >
                        {wgrywaLogo === slot.rola
                          ? "Wgrywam…"
                          : l
                            ? "Zmień"
                            : "Wgraj własny"}
                      </button>
                      {l && (
                        <button
                          onClick={() => usunLogoSlot(l)}
                          className="rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-red-ink hover:bg-red-soft/40"
                          title="Usuń własny plik (wróci znak domyślny)"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
