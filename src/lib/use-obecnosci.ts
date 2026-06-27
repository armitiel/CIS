"use client";

// Hook stanu obecności dla aktywnego projektu (etap E2).
// Utrzymuje mapę znaków `${uczestnikId}|${dataISO}` → 'p'|'a'|'l'|'w'.
// Źródła prawdy: localStorage (natychmiast) + Supabase (po zalogowaniu,
// best-effort). Zapisy idą do obu, aby działało też bez logowania.

import { useCallback, useEffect, useRef, useState } from "react";
import { bazaDostepna } from "@/lib/db-uczestnicy";
import {
  pobierzObecnosci,
  usunObecnoscDB,
  zapiszObecnoscDB,
  type Znak,
} from "@/lib/db-obecnosci";

export type { Znak };

const kluczLS = (projektId: string) => `cis-app:obecnosci:${projektId}`;
const klucz = (uczestnikId: string, dataIso: string) =>
  `${uczestnikId}|${dataIso}`;

export interface StanObecnosci {
  /** zwraca znak dla uczestnika w danym dniu albo null (brak wpisu) */
  znak: (uczestnikId: string, dataIso: string) => Znak | null;
  /** ustawia znak (null = usuń wpis); zapis do localStorage i bazy */
  ustaw: (uczestnikId: string, dataIso: string, znak: Znak | null) => void;
  /** wszystkie wpisy danego uczestnika (data ISO + znak), nieposortowane */
  wpisy: (uczestnikId: string) => { data: string; znak: Znak }[];
  /** true, gdy odczytano stan początkowy */
  gotowa: boolean;
}

export function useObecnosci(projektId: string): StanObecnosci {
  const [mapa, setMapa] = useState<Record<string, Znak>>({});
  const [gotowa, setGotowa] = useState(false);
  const projektRef = useRef(projektId);
  projektRef.current = projektId;

  // odczyt: localStorage natychmiast, potem (jeśli można) baza
  useEffect(() => {
    setGotowa(false);
    let anulowane = false;
    let zLokalnego: Record<string, Znak> = {};
    try {
      const raw = localStorage.getItem(kluczLS(projektId));
      if (raw) zLokalnego = JSON.parse(raw) as Record<string, Znak>;
    } catch {
      /* brak dostępu do localStorage */
    }
    setMapa(zLokalnego);
    setGotowa(true);

    if (bazaDostepna()) {
      (async () => {
        try {
          const wpisy = await pobierzObecnosci(projektId);
          if (anulowane || projektRef.current !== projektId) return;
          if (wpisy.length > 0) {
            const z: Record<string, Znak> = {};
            for (const w of wpisy) z[klucz(w.uczestnikId, w.data)] = w.znak;
            // Scal: baza jako podstawa, lokalne edycje na wierzchu. Dzięki temu
            // znaki jeszcze niezsynchronizowane (np. L4/DW przed migracją bazy)
            // nie znikają po odświeżeniu.
            setMapa((prev) => {
              const scalone = { ...z, ...prev };
              try {
                localStorage.setItem(kluczLS(projektId), JSON.stringify(scalone));
              } catch {
                /* limit localStorage */
              }
              return scalone;
            });
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

  const znak = useCallback(
    (uczestnikId: string, dataIso: string): Znak | null =>
      mapa[klucz(uczestnikId, dataIso)] ?? null,
    [mapa],
  );

  const ustaw = useCallback(
    (uczestnikId: string, dataIso: string, nowy: Znak | null) => {
      const k = klucz(uczestnikId, dataIso);
      setMapa((stan) => {
        const kopia = { ...stan };
        if (nowy === null) delete kopia[k];
        else kopia[k] = nowy;
        try {
          localStorage.setItem(kluczLS(projektId), JSON.stringify(kopia));
        } catch {
          /* limit localStorage */
        }
        return kopia;
      });
      if (bazaDostepna()) {
        const p = projektId;
        if (nowy === null) {
          usunObecnoscDB(p, uczestnikId, dataIso).catch(() => {
            /* brak sesji/tabeli — pozostaje zapis lokalny */
          });
        } else {
          zapiszObecnoscDB(p, uczestnikId, dataIso, nowy).catch(() => {
            /* brak sesji/tabeli — pozostaje zapis lokalny */
          });
        }
      }
    },
    [projektId],
  );

  const wpisy = useCallback(
    (uczestnikId: string): { data: string; znak: Znak }[] => {
      const prefix = `${uczestnikId}|`;
      const out: { data: string; znak: Znak }[] = [];
      for (const [k, v] of Object.entries(mapa)) {
        if (k.startsWith(prefix)) out.push({ data: k.slice(prefix.length), znak: v });
      }
      return out;
    },
    [mapa],
  );

  return { znak, ustaw, wpisy, gotowa };
}
