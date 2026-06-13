"use client";

// Hook harmonogramu zajęć dla aktywnego projektu (etap E4).
// Źródła: localStorage (natychmiast) + Supabase (po zalogowaniu, best-effort).

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  pobierzZajecia,
  usunZajecieDB,
  zapiszZajecieDB,
  type Zajecie,
} from "@/lib/db-zajecia";

export type { Zajecie };

const kluczLS = (projektId: string) => `cis-app:zajecia:${projektId}`;

function nowyId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `z-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export interface StanZajec {
  zajecia: Zajecie[];
  zapisz: (dane: Omit<Zajecie, "id"> & { id?: string }) => void;
  usun: (id: string) => void;
  gotowa: boolean;
}

export function useZajecia(projektId: string): StanZajec {
  const [zajecia, setZajecia] = useState<Zajecie[]>([]);
  const [gotowa, setGotowa] = useState(false);
  const projektRef = useRef(projektId);
  projektRef.current = projektId;

  useEffect(() => {
    setGotowa(false);
    let anulowane = false;
    let lokalne: Zajecie[] = [];
    try {
      const raw = localStorage.getItem(kluczLS(projektId));
      if (raw) lokalne = JSON.parse(raw) as Zajecie[];
    } catch {
      /* brak dostępu do localStorage */
    }
    setZajecia(lokalne);
    setGotowa(true);

    if (bazaDostepna()) {
      (async () => {
        try {
          const zBazy = await pobierzZajecia(projektId);
          if (anulowane || projektRef.current !== projektId) return;
          setZajecia(zBazy);
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
    (lista: Zajecie[]) => {
      try {
        localStorage.setItem(kluczLS(projektId), JSON.stringify(lista));
      } catch {
        /* limit localStorage */
      }
    },
    [projektId],
  );

  const zapisz = useCallback(
    (dane: Omit<Zajecie, "id"> & { id?: string }) => {
      const z: Zajecie = { ...dane, id: dane.id ?? nowyId() };
      setZajecia((stan) => {
        const istnieje = stan.some((x) => x.id === z.id);
        const nowe = istnieje
          ? stan.map((x) => (x.id === z.id ? z : x))
          : [...stan, z];
        nowe.sort((a, b) =>
          a.data === b.data
            ? a.godzina.localeCompare(b.godzina)
            : a.data.localeCompare(b.data),
        );
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        zapiszZajecieDB(z, projektId).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usun = useCallback(
    (id: string) => {
      setZajecia((stan) => {
        const nowe = stan.filter((x) => x.id !== id);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        usunZajecieDB(id).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [zapiszLokalnie],
  );

  return { zajecia, zapisz, usun, gotowa };
}
