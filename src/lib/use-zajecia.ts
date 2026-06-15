"use client";

// Hook harmonogramu zajęć dla aktywnego projektu (etap E4).
// Źródła: localStorage (natychmiast) + Supabase (po zalogowaniu, best-effort).

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  pobierzZajecia,
  usunSerieDB,
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

/** Nakłada pola wspólne serii na termin (każdy zachowuje swoją datę i id). */
function zPolamiWspolnymi(
  cel: Zajecie,
  zrodlo: Omit<Zajecie, "id"> & { id?: string },
): Zajecie {
  return {
    ...cel,
    nazwa: zrodlo.nazwa,
    typ: zrodlo.typ,
    prowadzacy: zrodlo.prowadzacy,
    grupa: zrodlo.grupa,
    godzina: zrodlo.godzina,
    godzinaDo: zrodlo.godzinaDo,
    kolor: zrodlo.kolor,
    osob: zrodlo.osob,
  };
}

function sortuj(lista: Zajecie[]): Zajecie[] {
  return [...lista].sort((a, b) =>
    a.data === b.data
      ? a.godzina.localeCompare(b.godzina)
      : a.data.localeCompare(b.data),
  );
}

export interface StanZajec {
  zajecia: Zajecie[];
  zapisz: (dane: Omit<Zajecie, "id"> & { id?: string }) => void;
  /** Zapisuje wiele terminów naraz (np. wygenerowaną serię cykliczną). */
  zapiszWiele: (lista: (Omit<Zajecie, "id"> & { id?: string })[]) => void;
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
      const istniejacy = dane.id
        ? zajecia.find((x) => x.id === dane.id)
        : undefined;

      // Edycja terminu należącego do serii → aktualizuj pola wspólne
      // we wszystkich terminach serii (każdy zachowuje swoją datę).
      if (istniejacy?.seria) {
        const seria = istniejacy.seria;
        const zaktualizowane = zajecia
          .filter((x) => x.seria === seria)
          .map((x) => zPolamiWspolnymi(x, dane));
        const mapa = new Map(zaktualizowane.map((x) => [x.id, x]));
        setZajecia((stan) => {
          const nowe = sortuj(stan.map((x) => mapa.get(x.id) ?? x));
          zapiszLokalnie(nowe);
          return nowe;
        });
        if (bazaDostepna()) {
          zaktualizowane.forEach((x) =>
            zapiszZajecieDB(x, projektId).catch(() => {}),
          );
        }
        return;
      }

      // Pojedynczy termin (nowy lub edycja bez serii).
      const z: Zajecie = { ...dane, id: dane.id ?? nowyId() };
      setZajecia((stan) => {
        const istnieje = stan.some((x) => x.id === z.id);
        const nowe = sortuj(
          istnieje ? stan.map((x) => (x.id === z.id ? z : x)) : [...stan, z],
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
    [projektId, zapiszLokalnie, zajecia],
  );

  const zapiszWiele = useCallback(
    (lista: (Omit<Zajecie, "id"> & { id?: string })[]) => {
      if (lista.length === 0) return;
      const nowe: Zajecie[] = lista.map((d) => ({ ...d, id: d.id ?? nowyId() }));
      setZajecia((stan) => {
        const polaczone = sortuj([...stan, ...nowe]);
        zapiszLokalnie(polaczone);
        return polaczone;
      });
      if (bazaDostepna()) {
        nowe.forEach((z) => zapiszZajecieDB(z, projektId).catch(() => {}));
      }
    },
    [projektId, zapiszLokalnie],
  );

  const usun = useCallback(
    (id: string) => {
      const cel = zajecia.find((x) => x.id === id);
      const seria = cel?.seria ?? null;
      setZajecia((stan) => {
        const nowe = seria
          ? stan.filter((x) => x.seria !== seria)
          : stan.filter((x) => x.id !== id);
        zapiszLokalnie(nowe);
        return nowe;
      });
      if (bazaDostepna()) {
        if (seria) {
          usunSerieDB(seria, projektId).catch(() => {});
        } else {
          usunZajecieDB(id).catch(() => {
            /* brak sesji/tabeli — pozostaje zapis lokalny */
          });
        }
      }
    },
    [projektId, zapiszLokalnie, zajecia],
  );

  return { zajecia, zapisz, zapiszWiele, usun, gotowa };
}
