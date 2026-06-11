# CIS Świebodzin — aplikacja do obsługi Centrum

Aplikacja webowa wspierająca kadrę Centrum Integracji Społecznej w Świebodzinie
(Stowarzyszenie na Rzecz Edukacji „Pomost”, projekt FELB.06.11-IZ.00-001/26).

Zakres docelowy opisuje dokument **Koncepcja_aplikacji_CIS_Swiebodzin.docx**
(moduły: uczestnicy i rekrutacja, ścieżki IŚR/IPZS/IPR, obecności i świadczenia,
kadra i harmonogram, generator dokumentacji).

**Stan obecny:** szkielet aplikacji z pulpitem i modułem Uczestnicy na danych
testowych (fikcyjnych). Bez bazy danych i logowania — to etap E1.

## Technologia

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- docelowo: Supabase (PostgreSQL + logowanie, region EU/Frankfurt)

## Uruchomienie lokalne

Wymagany Node.js 20+ (https://nodejs.org).

```bash
cd cis-app
npm install
npm run dev
```

Aplikacja działa pod adresem http://localhost:3000

## Publikacja online (GitHub + Vercel)

1. Załóż repozytorium na https://github.com (prywatne!), np. `cis-app`.
2. W folderze projektu:

   ```bash
   git remote add origin https://github.com/TWOJA-NAZWA/cis-app.git
   git push -u origin main
   ```

3. Na https://vercel.com: **Add New → Project → Import** wybierz repo `cis-app`.
   Vercel sam wykryje Next.js — kliknij **Deploy**.
4. Od tej pory każdy `git push` publikuje nową wersję automatycznie,
   a każda gałąź dostaje osobny adres podglądowy (preview).

Zalecane ustawienia Vercel: region funkcji **fra1 (Frankfurt)**.

## RODO — ważne

- W wersji rozwojowej używamy **wyłącznie danych fikcyjnych** (`src/lib/mock-data.ts`).
- Przed wprowadzeniem prawdziwych danych uczestników: umowy powierzenia (DPA)
  z Vercel i Supabase albo migracja na hosting w PL/UE, analiza ryzyka (DPIA),
  logowanie i role użytkowników — patrz rozdz. 6 koncepcji.
- Plików `.env` z kluczami nigdy nie commitujemy (są w `.gitignore`).

## Struktura projektu

```
src/
  app/
    page.tsx              — Pulpit (przegląd dnia, alerty)
    uczestnicy/           — lista uczestników + kartoteka
    sciezki/              — IŚR/IPZS/IPR (etap E3)
    obecnosci/            — obecności i świadczenia (etap E2)
    harmonogram/          — kadra i plan zajęć (etap E4)
    dokumenty/            — generator dokumentacji (etap E5/E6)
  components/             — wspólne komponenty UI
  lib/
    types.ts              — typy domenowe (model danych z koncepcji)
    mock-data.ts          — dane testowe (do zastąpienia bazą)
```

## Plan rozwoju (zgodnie z koncepcją)

| Etap | Zakres |
|------|--------|
| E1 | Baza danych (Supabase), logowanie i role, formularze uczestników z walidacją (PESEL, słowniki SOWA), eksport CSV do SOWA |
| E2 | Obecności i naliczanie świadczeń integracyjnych |
| E3 | Ścieżki IŚR/IPZS/IPR z wpisami kadry |
| E4 | Harmonogram zajęć i karty czasu pracy |
| E5 | Generator dokumentów (szablony docx + silnik reguł) |
| E6 | Konfigurator projektów — obsługa kolejnych projektów Stowarzyszenia |
