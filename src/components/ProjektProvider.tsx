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
  projektWbudowany,
  wczytajNadpisania,
  wczytajProjektyWlasne,
  zapiszNadpisania,
  zapiszProjektyWlasne,
  zbudujProjektWlasny,
  type NadpisanieProjektu,
  type Projekt,
  type ProjektWlasnyZapis,
} from "@/lib/projekty";
import type { Uczestnik } from "@/lib/types";
import {
  importujUczestnikow,
  type WynikImportu,
} from "@/lib/import-uczestnikow";
import {
  bazaDostepna,
  dodajUczestnikaDB,
  pobierzUczestnikow,
  usunUczestnikowProjektu,
  zastapUczestnikow,
} from "@/lib/db-uczestnicy";

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
  /** aktualizuje dane projektu własnego; zwraca false dla projektów wbudowanych */
  aktualizujProjekt: (
    id: string,
    zmiany: Partial<Omit<ProjektWlasnyZapis, "id">>,
  ) => boolean;
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
  const [nadpisania, setNadpisania] = useState<
    Record<string, NadpisanieProjektu>
  >({});
  const [gotowy, setGotowy] = useState(false);

  // odczyt zapisanego stanu (po stronie przeglądarki)
  useEffect(() => {
    try {
      const zapisaneWlasne = wczytajProjektyWlasne();
      setWlasne(zapisaneWlasne);
      setNadpisania(wczytajNadpisania());
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

  const wszystkieProjekty = useMemo(() => {
    // nadpisz wyświetlaną nazwę/skrót projektów wbudowanych (zapis lokalny)
    const wbudowane = projekty.map((p) => {
      const n = nadpisania[p.id];
      return n ? { ...p, nazwa: n.nazwa ?? p.nazwa, skrot: n.skrot ?? p.skrot } : p;
    });
    return [...wbudowane, ...wlasne.map(zbudujProjektWlasny)];
  }, [wlasne, nadpisania]);

  const projekt =
    wszystkieProjekty.find((p) => p.id === projektId) ?? projektDomyslny;

  // E1: po zalogowaniu pobierz uczestników aktywnego projektu z bazy (Supabase).
  // Gdy baza zwróci rekordy — stają się źródłem prawdy; gdy pusto/błąd —
  // zostaje localStorage/dane domyślne (tryb offline/niezalogowany).
  useEffect(() => {
    if (!gotowy || !bazaDostepna()) return;
    let anulowane = false;
    (async () => {
      try {
        const zBazy = await pobierzUczestnikow(projekt.id);
        if (!anulowane && zBazy.length > 0) {
          setImportowani((stan) => ({ ...stan, [projekt.id]: zBazy }));
        }
      } catch {
        /* brak sesji / tabeli — zostajemy na danych lokalnych */
      }
    })();
    return () => {
      anulowane = true;
    };
  }, [gotowy, projekt.id]);

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
        // E1: zapis do bazy (best-effort; gdy niezalogowany/brak bazy — pomijamy)
        if (bazaDostepna()) {
          try {
            await zastapUczestnikow(wynik.uczestnicy, projekt.id);
          } catch {
            /* brak sesji/tabeli — pozostaje zapis lokalny */
          }
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
    if (bazaDostepna()) {
      usunUczestnikowProjektu(projekt.id).catch(() => {
        /* brak sesji/tabeli — pomijamy */
      });
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
      // E1: zapis do bazy (best-effort)
      if (bazaDostepna()) {
        dodajUczestnikaDB(u, projekt.id).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
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

  /**
   * Aktualizuje dane projektu. Dla projektu własnego zmienia jego zapis,
   * dla wbudowanego zapisuje nadpisanie nazwy/skrótu (lokalnie). Zawsze true.
   */
  const aktualizujProjekt = useCallback(
    (id: string, zmiany: Partial<Omit<ProjektWlasnyZapis, "id">>): boolean => {
      if (projektWbudowany(id)) {
        // tylko nazwa i skrót mają sens dla projektu wbudowanego
        setNadpisania((stan) => {
          const biezace = stan[id] ?? {};
          const nowe: NadpisanieProjektu = {
            ...biezace,
            ...(zmiany.nazwa !== undefined ? { nazwa: zmiany.nazwa } : {}),
            ...(zmiany.skrot !== undefined ? { skrot: zmiany.skrot } : {}),
          };
          const mapa = { ...stan, [id]: nowe };
          zapiszNadpisania(mapa);
          return mapa;
        });
        return true;
      }
      let zaktualizowano = false;
      setWlasne((stan) => {
        if (!stan.some((p) => p.id === id)) return stan;
        zaktualizowano = true;
        const nowe = stan.map((p) =>
          p.id === id ? { ...p, ...zmiany, id } : p,
        );
        zapiszProjektyWlasne(nowe);
        return nowe;
      });
      return zaktualizowano;
    },
    [],
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
      aktualizujProjekt,
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
      aktualizujProjekt,
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
