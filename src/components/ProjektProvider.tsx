"use client";

// Kontekst aktywnego projektu: wybór projektu + baza uczestników per projekt.
// Uczestnicy zaimportowani z Excel/CSV są zapisywani w localStorage przeglądarki
// (dane nie opuszczają komputera — etap E1 przeniesie je do bazy z logowaniem).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  projekty,
  projektDomyslny,
  wczytajProjektyWlasne,
  zapiszProjektyWlasne,
  zbudujProjektWlasny,
  type Projekt,
  type ProjektWlasnyZapis,
} from "@/lib/projekty";
import type { Uczestnik } from "@/lib/types";
import {
  importujUczestnikow,
  type WynikImportu,
} from "@/lib/import-uczestnikow";

const KLUCZ_PROJEKT = "cis-app:aktywny-projekt";
const kluczUczestnikow = (projektId: string) =>
  `cis-app:uczestnicy:${projektId}`;

interface ProjektContextValue {
  projekt: Projekt;
  projekty: Projekt[];
  zmienProjekt: (id: string) => void;
  uczestnicy: Uczestnik[];
  zaimportowano: boolean;
  importuj: (file: File) => Promise<WynikImportu>;
  wyczyscImport: () => void;
  dodajUczestnika: (u: Uczestnik) => void;
  /** dodaje projekt własny (zapis w przeglądarce) i przełącza na niego */
  dodajProjekt: (zapis: ProjektWlasnyZapis) => void;
  /** usuwa projekt własny (wbudowanych nie można usunąć) */
  usunProjekt: (id: string) => void;
  /** true, jeśli aktywny projekt jest własny (dodany przez użytkownika) */
  projektWlasny: boolean;
}

const Ctx = createContext<ProjektContextValue | null>(null);

export function ProjektProvider({ children }: { children: React.ReactNode }) {
  const [projektId, setProjektId] = useState(projektDomyslny.id);
  const [importowani, setImportowani] = useState<Record<string, Uczestnik[]>>(
    {},
  );
  const [wlasne, setWlasne] = useState<ProjektWlasnyZapis[]>([]);
  const [gotowy, setGotowy] = useState(false);

  // odczyt zapisanego stanu (po stronie przeglądarki)
  useEffect(() => {
    try {
      const zapisaneWlasne = wczytajProjektyWlasne();
      setWlasne(zapisaneWlasne);
      const wszystkieIds = [
        ...projekty.map((p) => p.id),
        ...zapisaneWlasne.map((p) => p.id),
      ];
      const zapisany = localStorage.getItem(KLUCZ_PROJEKT);
      if (zapisany && wszystkieIds.includes(zapisany)) {
        setProjektId(zapisany);
      }
      const wczytani: Record<string, Uczestnik[]> = {};
      for (const id of wszystkieIds) {
        const raw = localStorage.getItem(kluczUczestnikow(id));
        if (raw) wczytani[id] = JSON.parse(raw) as Uczestnik[];
      }
      setImportowani(wczytani);
    } catch {
      // brak dostępu do localStorage — działamy na danych domyślnych
    }
    setGotowy(true);
  }, []);

  const wszystkieProjekty = useMemo(
    () => [...projekty, ...wlasne.map(zbudujProjektWlasny)],
    [wlasne],
  );

  const projekt =
    wszystkieProjekty.find((p) => p.id === projektId) ?? projektDomyslny;

  const zmienProjekt = useCallback((id: string) => {
    setProjektId(id);
    try {
      localStorage.setItem(KLUCZ_PROJEKT, id);
    } catch {
      /* ignoruj */
    }
  }, []);

  const importuj = useCallback(
    async (file: File): Promise<WynikImportu> => {
      const wynik = await importujUczestnikow(file, projekt.id);
      if (wynik.uczestnicy.length > 0) {
        setImportowani((stan) => ({
          ...stan,
          [projekt.id]: wynik.uczestnicy,
        }));
        try {
          localStorage.setItem(
            kluczUczestnikow(projekt.id),
            JSON.stringify(wynik.uczestnicy),
          );
        } catch {
          /* np. brak miejsca — dane pozostaną tylko w pamięci sesji */
        }
      }
      return wynik;
    },
    [projekt.id],
  );

  const wyczyscImport = useCallback(() => {
    setImportowani((stan) => {
      const kopia = { ...stan };
      delete kopia[projekt.id];
      return kopia;
    });
    try {
      localStorage.removeItem(kluczUczestnikow(projekt.id));
    } catch {
      /* ignoruj */
    }
  }, [projekt.id]);

  const uczestnicy = importowani[projekt.id] ?? projekt.uczestnicyDomyslni;
  const zaimportowano = projekt.id in importowani;

  /** Dodaje uczestnika do bazy projektu (zapis lokalny — etap E1: baza online). */
  const dodajUczestnika = useCallback(
    (u: Uczestnik) => {
      setImportowani((stan) => {
        const obecni = stan[projekt.id] ?? projekt.uczestnicyDomyslni;
        const nowi = [...obecni, u];
        try {
          localStorage.setItem(
            kluczUczestnikow(projekt.id),
            JSON.stringify(nowi),
          );
        } catch {
          /* limit localStorage — dane pozostaną w pamięci sesji */
        }
        return { ...stan, [projekt.id]: nowi };
      });
    },
    [projekt.id, projekt.uczestnicyDomyslni],
  );

  /** Dodaje projekt własny i przełącza na niego. */
  const dodajProjekt = useCallback(
    (zapis: ProjektWlasnyZapis) => {
      setWlasne((stan) => {
        const nowe = [...stan.filter((p) => p.id !== zapis.id), zapis];
        zapiszProjektyWlasne(nowe);
        return nowe;
      });
      zmienProjekt(zapis.id);
    },
    [zmienProjekt],
  );

  /** Usuwa projekt własny wraz z jego bazą uczestników. */
  const usunProjekt = useCallback(
    (id: string) => {
      setWlasne((stan) => {
        if (!stan.some((p) => p.id === id)) return stan; // wbudowane nietykalne
        const nowe = stan.filter((p) => p.id !== id);
        zapiszProjektyWlasne(nowe);
        return nowe;
      });
      setImportowani((stan) => {
        const kopia = { ...stan };
        delete kopia[id];
        return kopia;
      });
      try {
        localStorage.removeItem(kluczUczestnikow(id));
      } catch {
        /* ignoruj */
      }
      if (projektId === id) zmienProjekt(projektDomyslny.id);
    },
    [projektId, zmienProjekt],
  );

  const projektWlasny = wlasne.some((p) => p.id === projekt.id);

  const value = useMemo(
    () => ({
      projekt,
      projekty: wszystkieProjekty,
      zmienProjekt,
      uczestnicy,
      zaimportowano,
      importuj,
      wyczyscImport,
      dodajUczestnika,
      dodajProjekt,
      usunProjekt,
      projektWlasny,
    }),
    [
      projekt,
      wszystkieProjekty,
      zmienProjekt,
      uczestnicy,
      zaimportowano,
      importuj,
      wyczyscImport,
      dodajUczestnika,
      dodajProjekt,
      usunProjekt,
      projektWlasny,
    ],
  );

  // do czasu odczytu localStorage renderujemy dane domyślne (unikamy migotania)
  if (!gotowy) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjekt(): ProjektContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useProjekt musi być użyte wewnątrz <ProjektProvider>");
  return ctx;
}
