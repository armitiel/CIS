// DANE TESTOWE (fikcyjne) — do zastąpienia bazą danych (Supabase) w etapie E1.
// UWAGA RODO: w wersji rozwojowej nie wprowadzać prawdziwych danych uczestników.

import type { Uczestnik, Zajecia, Alert } from "./types";

export const uczestnicy: Uczestnik[] = [
  { id: "u-001", imie: "Anna", nazwisko: "Testowa", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 92, brakujaceDokumenty: [], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","zaswiadczenie-pup","isr","ipzs"] },
  { id: "u-002", imie: "Jan", nazwisko: "Przykładowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 64, brakujaceDokumenty: ["IŚR — podpis"], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","zaswiadczenie-pup","ipzs"] },
  { id: "u-003", imie: "Maria", nazwisko: "Wzorcowa", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 88, brakujaceDokumenty: [], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","isr","ipr"] },
  { id: "u-004", imie: "Piotr", nazwisko: "Demo", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "aktywny", dataPrzystapienia: "2026-07-06", frekwencja: 79, brakujaceDokumenty: ["Zaświadczenie OPS"], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","isr"] },
  { id: "u-005", imie: "Katarzyna", nazwisko: "Próbna", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "A", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 95, brakujaceDokumenty: [], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","zaswiadczenie-pup","isr","ipzs"] },
  { id: "u-006", imie: "Tomasz", nazwisko: "Fikcyjny", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 41, brakujaceDokumenty: ["Deklaracja uczestnictwa", "IŚR — podpis"], posiadaneDokumenty: ["formularz-zgloszeniowy","oswiadczenie-rodo","zaswiadczenie-pup"] },
  { id: "u-007", imie: "Ewa", nazwisko: "Przyklad", kategoria: "bierny", sciezka: "IPR", cykl: 1, grupa: "B", status: "rezerwowy", dataPrzystapienia: "—", frekwencja: 0, brakujaceDokumenty: ["Formularz zgłoszeniowy"], posiadaneDokumenty: ["deklaracja-uczestnictwa"] },
  { id: "u-008", imie: "Marek", nazwisko: "Testowy", kategoria: "bezrobotny", sciezka: "IPZS", cykl: 1, grupa: "C", status: "aktywny", dataPrzystapienia: "2026-07-01", frekwencja: 85, brakujaceDokumenty: [], posiadaneDokumenty: ["formularz-zgloszeniowy","deklaracja-uczestnictwa","oswiadczenie-rodo","zaswiadczenie-pup","isr","ipzs"] },
];

export const dzisiejszeZajecia: Zajecia[] = [
  { id: "z-1", nazwa: "Warsztat kompetencji społecznych", prowadzacy: "Trener", grupa: "A", godzina: "09:00–12:00", sala: "Sala 1" },
  { id: "z-2", nazwa: "Zajęcia praktyczne — instruktor zawodu", prowadzacy: "Instruktor I", grupa: "C", godzina: "09:00–13:00", sala: "Warsztat" },
  { id: "z-3", nazwa: "Konsultacje indywidualne", prowadzacy: "Psycholog", grupa: "wg zapisów", godzina: "12:30–15:30", sala: "Gabinet" },
];

export const alerty: Alert[] = [
  { id: "a-1", typ: "frekwencja", tresc: "Tomasz Fikcyjny — frekwencja 41% (próg ryzyka: 50%)", uczestnikId: "u-006" },
  { id: "a-2", typ: "dokumenty", tresc: "2 uczestników ma niekompletne teczki dokumentów", uczestnikId: undefined },
  { id: "a-3", typ: "sciezka", tresc: "Przegląd IŚR dla grupy A — termin do 30.06.2026" },
];

export const limity = {
  bezrobotni: { zajete: 5, limit: 54 },
  bierni: { zajete: 3, limit: 47 },
};
