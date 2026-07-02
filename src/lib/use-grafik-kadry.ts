"use client";

// Hook grafiku kadry dla aktywnego projektu (etap E9).
// Źródła: localStorage (natychmiast) + Supabase (po zalogowaniu, best-effort).

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  pobierzGrafik,
  usunWpisDB,
  usunWpisyOsobyDB,
  zapiszWpisDB,
  type WpisGrafiku,
  type TypZajec,
} from "@/lib/db-grafik-kadry";

export type { WpisGrafiku, TypZajec };

const kluczLS = (projektId: string) => `cis-app:grafik-kadry:${projektId}`;

function nowyId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function sortuj(lista: WpisGrafiku[]): WpisGrafiku[] {
  return [...lista].sort((a, b) =>
    a.data === b.data
      ? a.godzinaOd.localeCompare(b.godzinaOd)
      : a.data.localeCompare(b.data),
  );
}

export interface StanGrafiku {
  grafik: WpisGrafiku[];
  zapisz: (dane: Omit<WpisGrafiku, "id"> & { id?: string }) => void;
  usun: (id: string) => void;
  /** usuwa wszystkie wpisy danej osoby (po skasowaniu jej z kadry) */
  usunOsobe: (kadraId: string) => void;
  gotowa: boolean;
  /** komunikat, gdy zapis/usuwanie w bazie się nie powiodło (null = brak błędu) */
  bladZapisu: string | null;
  /** kasuje komunikat błędu (po zamknięciu przez użytkownika) */
  wyczyscBlad: () => void;
}

const KOMUNIKAT_BLEDU =
  "Nie udało się zapisać zmian w bazie. Odśwież stronę (mogłaś zostać wylogowana), a potem spróbuj ponownie.";

export function useGrafikKadry(projektId: string): StanGrafiku {
  const [grafik, setGrafik] = useState<WpisGrafiku[]>([]);
  const [gotowa, setGotowa] = useState(false);
  const [bladZapisu, setBladZapisu] = useState<string | null>(null);
  const wyczyscBlad = useCallback(() => setBladZapisu(null), []);
  const projektRef = useRef(projektId);
  projektRef.current = projektId;

  useEffect(() => {
    setGotowa(false);
    setBladZapisu(null);
    let anulowane = false;
    let lokalne: WpisGrafiku[] = [];
    try {
      const raw = localStorage.getItem(kluczLS(projektId));
      if (raw) lokalne = JSON.parse(raw) as WpisGrafiku[];
    } catch {
      /* brak dostępu do localStorage */
    }
    setGrafik(lokalne);
    setGotowa(true);

    if (bazaDostepna()) {
      (async () => {
        try {
          const zBazy = await pobierzGrafik(projektId);
          if (anulowane || projektRef.current !== projektId) return;
          setGrafik(zBazy);
          try {
            localStorage.setItem(kluczLS(projektId), JSON.stringify(zBazy));
          } catch {
            /* limit localStorage */
          }
        } catch {
          /* brak sesji/tabeli — zostajemy na danych lokalnych */
        }
      })();
    }
    return () => {
      anulowane = true;
    };
  }, [projektId]);

  const zapiszLokalnie = useCallback(
    (lista: WpisGrafiku[]) => {
      try {
        localStorage.setItem(kluczLS(projektId), JSON.stringify(lista));
      } catch {
        /* limit localStorage */
      }
    },
    [projektId],
  );

  const zapisz = useCallback(
    (dane: Omit<WpisGrafiku, "id"> & { id?: string }) => {
      const w: WpisGrafiku = { ...dane, id: dane.id ?? nowyId() };
      setGrafik((stan) => {
        const istnieje = stan.some((x) => x.id === w.id);
        const nowe = sortuj(
          istnieje ? stan.map((x) => (x.id === w.id ? w : x)) : [...stan, w],
        );
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        zapiszWpisDB(w, projektId).catch(() => {
          setBladZapisu(KOMUNIKAT_BLEDU);
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usun = useCallback(
    (id: string) => {
      setGrafik((stan) => {
        const nowe = stan.filter((x) => x.id !== id);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        usunWpisDB(id).catch(() => {
          setBladZapisu(KOMUNIKAT_BLEDU);
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usunOsobe = useCallback(
    (kadraId: string) => {
      setGrafik((stan) => {
        const nowe = stan.filter((x) => x.kadraId !== kadraId);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        usunWpisyOsobyDB(kadraId, projektId).catch(() => {
          setBladZapisu(KOMUNIKAT_BLEDU);
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  return { grafik, zapisz, usun, usunOsobe, gotowa, bladZapisu, wyczyscBlad };
}
