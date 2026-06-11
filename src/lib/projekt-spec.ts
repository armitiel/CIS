// Specyfikacja dokumentacyjna projektu — "rozpoznany wniosek".
// Docelowo (etap E6) specyfikacje będą tworzone automatycznie przez analizę AI
// wczytanego wniosku o dofinansowanie. Na razie wbudowana: nabór FELB.06.11.

import type { KategoriaUczestnika, Uczestnik } from "./types";

export type MomentDokumentu = "rekrutacja" | "udział" | "zakończenie";
export type DotyczyKogo = "wszyscy" | KategoriaUczestnika;

export interface WymaganyDokument {
  id: string;
  nazwa: string;
  dotyczy: DotyczyKogo;
  moment: MomentDokumentu;
  generowalny: boolean; // czy aplikacja umie go wygenerować z danych
  opis: string;
}

export interface SpecyfikacjaProjektu {
  id: string;
  nazwa: string;
  nabor: string;
  wnioskodawca: string;
  okres: string;
  dokumenty: WymaganyDokument[];
}

export const specyfikacjaCIS: SpecyfikacjaProjektu = {
  id: "cis-2026",
  nazwa: "Centrum Integracji Społecznej w Świebodzinie",
  nabor: "FELB.06.11-IZ.00-001/26 (ZIT)",
  wnioskodawca: "Stowarzyszenie na Rzecz Edukacji „Pomost”",
  okres: "01.06.2026 – 31.12.2027",
  dokumenty: [
    {
      id: "formularz-zgloszeniowy",
      nazwa: "Formularz zgłoszeniowy",
      dotyczy: "wszyscy",
      moment: "rekrutacja",
      generowalny: true,
      opis: "Dane uczestnika zgodne ze słownikami SOWA (odpowiednik A-01)",
    },
    {
      id: "deklaracja-uczestnictwa",
      nazwa: "Deklaracja uczestnictwa w projekcie",
      dotyczy: "wszyscy",
      moment: "rekrutacja",
      generowalny: true,
      opis: "Podpisywana w dniu przystąpienia do projektu",
    },
    {
      id: "oswiadczenie-rodo",
      nazwa: "Oświadczenie RODO uczestnika",
      dotyczy: "wszyscy",
      moment: "rekrutacja",
      generowalny: true,
      opis: "Klauzula informacyjna FEWL 2021–2027 + zgoda na przetwarzanie",
    },
    {
      id: "zaswiadczenie-pup",
      nazwa: "Zaświadczenie z PUP o statusie osoby bezrobotnej",
      dotyczy: "bezrobotny",
      moment: "rekrutacja",
      generowalny: false,
      opis: "Dostarcza uczestnik — warunek ścieżki IPZS (uczestnik CIS)",
    },
    {
      id: "isr",
      nazwa: "Indywidualna Ścieżka Reintegracji (IŚR)",
      dotyczy: "wszyscy",
      moment: "udział",
      generowalny: true,
      opis: "Opracowywana z uczestnikiem po diagnozie (Zadanie 1)",
    },
    {
      id: "ipzs",
      nazwa: "Indywidualny Program Zatrudnienia Socjalnego (IPZS)",
      dotyczy: "bezrobotny",
      moment: "udział",
      generowalny: true,
      opis: "Dla uczestników CIS — ustawa o zatrudnieniu socjalnym",
    },
    {
      id: "ipr",
      nazwa: "Indywidualny Plan Reintegracji (IPR)",
      dotyczy: "bierny",
      moment: "udział",
      generowalny: true,
      opis: "Dla osób biernych zawodowo",
    },
    {
      id: "zaswiadczenie-uczestnictwa",
      nazwa: "Zaświadczenie o uczestnictwie",
      dotyczy: "wszyscy",
      moment: "zakończenie",
      generowalny: true,
      opis: "Wydawane po zakończeniu udziału w projekcie",
    },
  ],
};

/** Silnik reguł: dokumenty wymagane dla danego uczestnika (wg kategorii i statusu). */
export function wymaganeDokumenty(u: Uczestnik): WymaganyDokument[] {
  return specyfikacjaCIS.dokumenty.filter((d) => {
    if (d.dotyczy !== "wszyscy" && d.dotyczy !== u.kategoria) return false;
    if (d.moment === "zakończenie" && u.status !== "zakończył") return false;
    if (d.moment === "udział" && u.status === "rezerwowy") return false;
    return true;
  });
}

/** Braki w teczce uczestnika względem specyfikacji. */
export function brakiWTeczce(u: Uczestnik): WymaganyDokument[] {
  return wymaganeDokumenty(u).filter(
    (d) => !u.posiadaneDokumenty.includes(d.id),
  );
}
