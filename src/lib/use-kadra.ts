"use client";

// Hook listy kadry (osób zatrudnionych) dla aktywnego projektu (etap E9).
// Źródła: localStorage (natychmiast) + Supabase (po zalogowaniu, best-effort).

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  pobierzKadre,
  usunOsobeDB,
  zapiszOsobeDB,
  type OsobaKadry,
} from "@/lib/db-kadra";
import { normTyp } from "@/lib/db-grafik-kadry";

export type { OsobaKadry };

const kluczLS = (projektId: string) => `cis-app:kadra:${projektId}`;

function nowyId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function sortuj(lista: OsobaKadry[]): OsobaKadry[] {
  return [...lista].sort((a, b) =>
    a.nazwisko === b.nazwisko
      ? a.imie.localeCompare(b.imie, "pl")
      : a.nazwisko.localeCompare(b.nazwisko, "pl"),
  );
}

/** Uzupełnia domyślne pola dla starszych wpisów (np. z pamięci lokalnej). */
function uzupelnij(o: Partial<OsobaKadry> & { id: string }): OsobaKadry {
  return {
    id: o.id,
    imie: o.imie ?? "",
    nazwisko: o.nazwisko ?? "",
    stanowisko: o.stanowisko ?? "",
    wymiar: o.wymiar ?? "",
    godzinaOd: o.godzinaOd || "08:00",
    godzinaDo: o.godzinaDo || "16:00",
    typDomyslny: normTyp(o.typDomyslny),
    aktywny: o.aktywny ?? true,
  };
}

export interface StanKadry {
  kadra: OsobaKadry[];
  zapisz: (dane: Omit<OsobaKadry, "id"> & { id?: string }) => void;
  usun: (id: string) => void;
  gotowa: boolean;
}

export function useKadra(projektId: string): StanKadry {
  const [kadra, setKadra] = useState<OsobaKadry[]>([]);
  const [gotowa, setGotowa] = useState(false);
  const projektRef = useRef(projektId);
  projektRef.current = projektId;

  useEffect(() => {
    setGotowa(false);
    let anulowane = false;
    let lokalne: OsobaKadry[] = [];
    try {
      const raw = localStorage.getItem(kluczLS(projektId));
      if (raw)
        lokalne = (JSON.parse(raw) as (Partial<OsobaKadry> & { id: string })[])
          .map(uzupelnij);
    } catch {
      /* brak dostępu do localStorage */
    }
    setKadra(lokalne);
    setGotowa(true);

    if (bazaDostepna()) {
      (async () => {
        try {
          const zBazy = await pobierzKadre(projektId);
          if (anulowane || projektRef.current !== projektId) return;
          setKadra(zBazy);
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
    (lista: OsobaKadry[]) => {
      try {
        localStorage.setItem(kluczLS(projektId), JSON.stringify(lista));
      } catch {
        /* limit localStorage */
      }
    },
    [projektId],
  );

  const zapisz = useCallback(
    (dane: Omit<OsobaKadry, "id"> & { id?: string }) => {
      const o: OsobaKadry = { ...dane, id: dane.id ?? nowyId() };
      setKadra((stan) => {
        const istnieje = stan.some((x) => x.id === o.id);
        const nowe = sortuj(
          istnieje ? stan.map((x) => (x.id === o.id ? o : x)) : [...stan, o],
        );
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        zapiszOsobeDB(o, projektId).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usun = useCallback(
    (id: string) => {
      setKadra((stan) => {
        const nowe = stan.filter((x) => x.id !== id);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        usunOsobeDB(id).catch(() => {
          /* brak sesji/tabeli — pozostaje zapis lokalny */
        });
      }
    },
    [projektId, zapiszLokalnie],
  );

  return { kadra, zapisz, usun, gotowa };
}
