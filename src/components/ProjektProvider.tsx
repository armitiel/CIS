"use client";

// Kontekst aktywnego projektu: wybór projektu + baza uczestników per projekt.
//
// Model danych (etap E1):
//  • Tryb BAZY (zalogowany, Supabase dostępny) — projekty i uczestnicy są
//    PRYWATNE per użytkownik (RLS po user_id). Przykładowe projekty są
//    zaszczepiane przy pierwszym logowaniu i można je usunąć.
//  • Tryb LOKALNY (brak Supabase/sesji) — projekty wbudowane z kodu +
//    projekty własne i uczestnicy w localStorage przeglądarki.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  projekty as projektyWbudowane,
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
import {
  aktualizujUczestnikaDB,
  bazaDostepna,
  dodajUczestnikaDB,
  pobierzUczestnikow,
  usunUczestnikowProjektu,
  zastapUczestnikow,
} from "@/lib/db-uczestnicy";
import {
  aktualizujProjektDB,
  czySesja,
  czyZasiano,
  pobierzProjekty,
  usunProjektDB,
  zapiszProjektDB,
  zasiejPrzykladowe,
} from "@/lib/db-projekty";

const KLUCZ_PROJEKT = "cis-app:aktywny-projekt";
const kluczUczestnikow = (projektId: string) =>
  `cis-app:uczestnicy:${projektId}`;

const IDS_WBUDOWANE = projektyWbudowane.map((p) => p.id);

interface ProjektContextValue {
  projekt: Projekt;
  projekty: Projekt[];
  zmienProjekt: (id: string) => void;
  uczestnicy: Uczestnik[];
  zaimportowano: boolean;
  importuj: (file: File) => Promise<WynikImportu>;
  wyczyscImport: () => void;
  dodajUczestnika: (u: Uczestnik) => void;
  /** aktualizuje pola uczestnika (np. etap/postęp ścieżki) — zapis lokalny + baza */
  aktualizujUczestnika: (id: string, zmiany: Partial<Uczestnik>) => void;
  /** dodaje projekt (zapis w bazie lub przeglądarce) i przełącza na niego */
  dodajProjekt: (zapis: ProjektWlasnyZapis) => void;
  /** aktualizuje dane projektu; zwraca false, gdy projektu nie można edytować */
  aktualizujProjekt: (
    id: string,
    zmiany: Partial<Omit<ProjektWlasnyZapis, "id">>,
  ) => boolean;
  /** usuwa projekt (tryb bazy — dowolny; tryb lokalny — tylko własny) */
  usunProjekt: (id: string) => void;
  /** true, jeśli aktywny projekt można edytować/usunąć */
  projektWlasny: boolean;
  /** sprawdza, czy dany projekt można edytować/usunąć */
  czyWlasny: (id: string) => boolean;
}

const Ctx = createContext<ProjektContextValue | null>(null);

export function ProjektProvider({ children }: { children: React.ReactNode }) {
  const [projektId, setProjektId] = useState(projektDomyslny.id);
  const [importowani, setImportowani] = useState<Record<string, Uczestnik[]>>(
    {},
  );
  // Lista projektów dynamicznych: tryb lokalny = własne z localStorage,
  // tryb bazy = wszystkie projekty użytkownika z Supabase.
  const [zapisy, setZapisy] = useState<ProjektWlasnyZapis[]>([]);
  const [trybBazy, setTrybBazy] = useState(false);
  const [gotowy, setGotowy] = useState(false);
  const zaladowanoBaze = useRef(false);

  // 1) Szybki odczyt stanu lokalnego (działa zanim odpowie baza / dla fallbacku).
  useEffect(() => {
    try {
      const zapisaneWlasne = wczytajProjektyWlasne();
      setZapisy(zapisaneWlasne);
      const wszystkieIds = [
        ...IDS_WBUDOWANE,
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

  // 2) Po starcie: jeśli Supabase skonfigurowany i jest sesja — przełącz na
  //    tryb bazy. Przy pierwszym logowaniu zaszczep przykładowe projekty.
  useEffect(() => {
    if (!gotowy || zaladowanoBaze.current || !bazaDostepna()) return;
    let anulowane = false;
    (async () => {
      try {
        if (!(await czySesja())) return; // niezalogowany → zostajemy lokalnie
        if (!(await czyZasiano())) {
          await zasiejPrzykladowe();
        }
        const zBazy = await pobierzProjekty();
        if (anulowane) return;
        zaladowanoBaze.current = true;
        setZapisy(zBazy);
        setTrybBazy(true);
        // dopasuj aktywny projekt do tego, co jest w bazie
        setProjektId((biezacy) =>
          zBazy.some((p) => p.id === biezacy)
            ? biezacy
            : (zBazy[0]?.id ?? biezacy),
        );
      } catch {
        // brak tabel / brak uprawnień → zostajemy w trybie lokalnym
      }
    })();
    return () => {
      anulowane = true;
    };
  }, [gotowy]);

  const wszystkieProjekty = useMemo(
    () =>
      trybBazy
        ? zapisy.map(zbudujProjektWlasny)
        : [...projektyWbudowane, ...zapisy.map(zbudujProjektWlasny)],
    [trybBazy, zapisy],
  );

  const projekt =
    wszystkieProjekty.find((p) => p.id === projektId) ??
    wszystkieProjekty[0] ??
    projektDomyslny;

  // E1: pobierz uczestników aktywnego projektu z bazy. Gdy baza zwróci rekordy
  // — stają się źródłem prawdy; gdy pusto/błąd — zostaje localStorage/domyślne.
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
      if (bazaDostepna()) {
        dodajUczestnikaDB(u, projekt.id).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [projekt.id, projekt.uczestnicyDomyslni],
  );

  /** Aktualizuje pola uczestnika (etap/postęp ścieżki itd.). */
  const aktualizujUczestnika = useCallback(
    (id: string, zmiany: Partial<Uczestnik>) => {
      setImportowani((stan) => {
        const obecni = stan[projekt.id] ?? projekt.uczestnicyDomyslni;
        const nowi = obecni.map((u) =>
          u.id === id ? { ...u, ...zmiany } : u,
        );
        try {
          localStorage.setItem(
            kluczUczestnikow(projekt.id),
            JSON.stringify(nowi),
          );
        } catch {
          /* limit localStorage */
        }
        return { ...stan, [projekt.id]: nowi };
      });
      if (bazaDostepna()) {
        aktualizujUczestnikaDB(id, zmiany).catch(() => {
          /* rekord spoza bazy / brak sesji — pozostaje zapis lokalny */
        });
      }
    },
    [projekt.id, projekt.uczestnicyDomyslni],
  );

  /** Czy projekt można edytować/usunąć. */
  const czyWlasny = useCallback(
    (id: string) => (trybBazy ? true : !IDS_WBUDOWANE.includes(id)),
    [trybBazy],
  );

  /** Dodaje projekt i przełącza na niego. */
  const dodajProjekt = useCallback(
    (zapis: ProjektWlasnyZapis) => {
      setZapisy((stan) => {
        const nowe = [...stan.filter((p) => p.id !== zapis.id), zapis];
        if (!trybBazy) zapiszProjektyWlasne(nowe);
        return nowe;
      });
      if (trybBazy) {
        zapiszProjektDB(zapis).catch(() => {
          /* zapis nie powiódł się — projekt pozostaje w stanie sesji */
        });
      }
      zmienProjekt(zapis.id);
    },
    [trybBazy, zmienProjekt],
  );

  /** Aktualizuje dane projektu (skrót/nazwa albo odświeżenie z wniosku). */
  const aktualizujProjekt = useCallback(
    (id: string, zmiany: Partial<Omit<ProjektWlasnyZapis, "id">>): boolean => {
      if (!czyWlasny(id)) return false;
      let zaktualizowano = false;
      setZapisy((stan) => {
        if (!stan.some((p) => p.id === id)) return stan;
        zaktualizowano = true;
        const nowe = stan.map((p) =>
          p.id === id ? { ...p, ...zmiany, id } : p,
        );
        if (!trybBazy) zapiszProjektyWlasne(nowe);
        return nowe;
      });
      if (zaktualizowano && trybBazy) {
        aktualizujProjektDB(id, zmiany).catch(() => {
          /* zapis nie powiódł się — zmiana pozostaje w stanie sesji */
        });
      }
      return zaktualizowano;
    },
    [czyWlasny, trybBazy],
  );

  /** Usuwa projekt wraz z jego bazą uczestników. */
  const usunProjekt = useCallback(
    (id: string) => {
      if (!czyWlasny(id)) return;
      let cel: string | null = null;
      setZapisy((stan) => {
        if (!stan.some((p) => p.id === id)) return stan;
        const nowe = stan.filter((p) => p.id !== id);
        if (!trybBazy) zapiszProjektyWlasne(nowe);
        if (projektId === id) {
          cel = trybBazy
            ? (nowe[0]?.id ?? projektDomyslny.id)
            : projektDomyslny.id;
        }
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
      if (trybBazy) {
        usunProjektDB(id).catch(() => {
          /* zapis nie powiódł się — usunięcie pozostaje w stanie sesji */
        });
      }
      if (cel) zmienProjekt(cel);
    },
    [czyWlasny, trybBazy, projektId, zmienProjekt],
  );

  const projektWlasny = czyWlasny(projekt.id);

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
      aktualizujUczestnika,
      dodajProjekt,
      aktualizujProjekt,
      usunProjekt,
      projektWlasny,
      czyWlasny,
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
      aktualizujUczestnika,
      dodajProjekt,
      aktualizujProjekt,
      usunProjekt,
      projektWlasny,
      czyWlasny,
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
