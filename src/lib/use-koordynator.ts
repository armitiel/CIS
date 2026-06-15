"use client";

// Hook tożsamości zalogowanego koordynatora — nazwa wyświetlana, rola, e-mail.
// Używany w panelu użytkownika, na stronie profilu, przy auto-autorze wpisów
// ścieżki i przy pokazywaniu koordynatora projektu.

import { useCallback, useEffect, useState } from "react";
import { pobierzProfil } from "@/lib/db-profil";

export interface StanKoordynatora {
  nazwa: string;
  rola: string;
  email: string;
  laduje: boolean;
  zalogowany: boolean;
  odswiez: () => Promise<void>;
}

export function useKoordynator(): StanKoordynatora {
  const [nazwa, setNazwa] = useState("");
  const [rola, setRola] = useState("");
  const [email, setEmail] = useState("");
  const [zalogowany, setZalogowany] = useState(false);
  const [laduje, setLaduje] = useState(true);

  const odswiez = useCallback(async () => {
    setLaduje(true);
    const p = await pobierzProfil();
    if (p) {
      setNazwa(p.nazwa);
      setRola(p.rola);
      setEmail(p.email);
      setZalogowany(true);
    } else {
      setZalogowany(false);
    }
    setLaduje(false);
  }, []);

  useEffect(() => {
    void odswiez();
  }, [odswiez]);

  return { nazwa, rola, email, laduje, zalogowany, odswiez };
}
