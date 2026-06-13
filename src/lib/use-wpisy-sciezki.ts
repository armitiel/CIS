"use client";

// Hook wpisów ścieżki dla aktywnego projektu (etap E3).
// Źródła: localStorage (natychmiast) + Supabase (po zalogowaniu, best-effort).
// Zapisy idą do obu. Wpisy mają id nadawane po stronie klienta (spójne z bazą).

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  dodajWpisDB,
  pobierzWpisy,
  usunWpisDB,
  type TypWpisu,
  type WpisSciezki,
} from "@/lib/db-sciezki";

export type { WpisSciezki, TypWpisu };

const kluczLS = (projektId: string) => `cis-app:wpisy-sciezki:${projektId}`;

function nowyId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export interface StanWpisow {
  wpisy: WpisSciezki[];
  dodaj: (dane: Omit<WpisSciezki, "id">) => void;
  usun: (id: string) => void;
  gotowa: boolean;
}

export function useWpisySciezki(projektId: string): StanWpisow {
  const [wpisy, setWpisy] = useState<WpisSciezki[]>([]);
  const [gotowa, setGotowa] = useState(false);
  const projektRef = useRef(projektId);
  projektRef.current = projektId;

  useEffect(() => {
    setGotowa(false);
    let anulowane = false;
    let lokalne: WpisSciezki[] = [];
    try {
      const raw = localStorage.getItem(kluczLS(projektId));
      if (raw) lokalne = JSON.parse(raw) as WpisSciezki[];
    } catch {
      /* brak dostępu do localStorage */
    }
    setWpisy(lokalne);
    setGotowa(true);

    if (bazaDostepna()) {
      (async () => {
        try {
          const zBazy = await pobierzWpisy(projektId);
          if (anulowane || projektRef.current !== projektId) return;
          setWpisy(zBazy);
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
    (lista: WpisSciezki[]) => {
      try {
        localStorage.setItem(kluczLS(projektId), JSON.stringify(lista));
      } catch {
        /* limit localStorage */
      }
    },
    [projektId],
  );

  const dodaj = useCallback(
    (dane: Omit<WpisSciezki, "id">) => {
      const wpis: WpisSciezki = { ...dane, id: nowyId() };
      setWpisy((stan) => {
        const nowe = [wpis, ...stan];
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        dodajWpisDB(projektId, wpis).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usun = useCallback(
    (id: string) => {
      setWpisy((stan) => {
        const nowe = stan.filter((w) => w.id !== id);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        usunWpisDB(id).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [zapiszLokalnie],
  );

  return { wpisy, dodaj, usun, gotowa };
}
