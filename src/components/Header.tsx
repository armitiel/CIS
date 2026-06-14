"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";

const KLUCZ_MOTYW = "cis-app:motyw";

/** Normalizacja do wyszukiwania: bez polskich znaków i wielkości liter. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const TYTULY: [string, string, string][] = [
  ["/uczestnicy", "Uczestnicy", "Baza osób w projekcie CIS"],
  ["/sciezki", "Ścieżki IŚR", "Indywidualne ścieżki reintegracji"],
  ["/obecnosci", "Obecności", "Frekwencja w bieżącym tygodniu"],
  ["/harmonogram", "Harmonogram", "Plan zajęć i warsztatów"],
  ["/dokumenty", "Dokumenty", "Generator dokumentacji projektowej"],
  ["/projekty", "Projekty", "Przełączanie i zarządzanie projektami"],
  ["/", "Pulpit", "Przegląd projektu i dzisiejsze działania"],
];

export default function Header({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { uczestnicy } = useProjekt();
  const [q, setQ] = useState("");
  const [otwarte, setOtwarte] = useState(false);
  const [ciemny, setCiemny] = useState(false);

  const podpowiedzi = useMemo(() => {
    const fraza = norm(q.trim());
    if (!fraza) return [];
    return uczestnicy
      .filter((u) => norm(`${u.imie} ${u.nazwisko}`).includes(fraza))
      .slice(0, 7);
  }, [q, uczestnicy]);

  function wybierz(id: string) {
    router.push(`/uczestnicy/${id}`);
    setQ("");
    setOtwarte(false);
  }

  useEffect(() => {
    setCiemny(document.documentElement.dataset.theme === "dark");
  }, []);

  function przelaczMotyw() {
    const nowy = !ciemny;
    setCiemny(nowy);
    document.documentElement.dataset.theme = nowy ? "dark" : "light";
    try {
      localStorage.setItem(KLUCZ_MOTYW, nowy ? "dark" : "light");
    } catch {
      /* ignoruj */
    }
  }

  const [, tytul, podtytul] =
    TYTULY.find(([p]) => (p === "/" ? pathname === "/" : pathname.startsWith(p))) ??
    TYTULY[TYTULY.length - 1];

  function szukaj(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOtwarte(false);
      return;
    }
    if (e.key === "Enter" && q.trim()) {
      // Enter: wejdź do pierwszej podpowiedzi, a gdy brak — pokaż listę z filtrem
      if (podpowiedzi.length > 0) wybierz(podpowiedzi[0].id);
      else router.push(`/uczestnicy?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <header className="z-[2] flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3.5 sm:gap-5 sm:px-6 lg:px-[34px] lg:py-[19px]">
      <button
        onClick={onMenu}
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-mid transition-colors duration-200 hover:bg-soft lg:hidden"
        title="Menu"
        aria-label="Otwórz menu"
      >
        <span className="material-symbols-rounded notranslate text-[24px]">
          menu
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate font-serif text-xl font-semibold leading-[1.05] text-ink-strong sm:text-[27px]">
          {tytul}
        </h1>
        <p className="m-0 mt-0.5 truncate text-[13px] text-muted sm:mt-1 sm:text-sm">
          {podtytul}
        </p>
      </div>
      <div className="relative hidden md:block">
        <label className="flex w-[248px] items-center gap-[9px] rounded-xl border border-line-strong bg-surface px-3.5 py-[9px] transition-[border-color,box-shadow] duration-200 focus-within:border-[oklch(0.62_0.09_152)] focus-within:shadow-[0_0_0_3px_oklch(0.55_0.09_152/0.12)]">
          <span className="material-symbols-rounded notranslate text-[20px] text-faint">
            search
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOtwarte(true);
            }}
            onFocus={() => setOtwarte(true)}
            onBlur={() => setTimeout(() => setOtwarte(false), 120)}
            onKeyDown={szukaj}
            placeholder="Szukaj uczestnika…"
            className="w-full border-none bg-transparent text-sm text-ink outline-none"
          />
        </label>
        {otwarte && q.trim() && (
          <div className="absolute right-0 z-50 mt-1.5 w-[288px] overflow-hidden rounded-xl border border-line-strong bg-panel py-1 shadow-[0_12px_30px_oklch(0.4_0.05_150/0.14)]">
            {podpowiedzi.length === 0 ? (
              <div className="px-3.5 py-2.5 text-sm text-faint">
                Brak uczestników pasujących do „{q.trim()}”.
              </div>
            ) : (
              podpowiedzi.map((u) => (
                <button
                  key={u.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    wybierz(u.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-soft"
                >
                  <span className="truncate text-sm font-semibold text-ink">
                    {u.nazwisko} {u.imie}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-faint">
                    {u.sciezka}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <button
        onClick={przelaczMotyw}
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-mid transition-colors duration-200 hover:bg-soft"
        title={ciemny ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      >
        <span className="material-symbols-rounded notranslate text-[22px]">
          {ciemny ? "light_mode" : "dark_mode"}
        </span>
      </button>
    </header>
  );
}
