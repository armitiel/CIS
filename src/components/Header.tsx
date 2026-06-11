"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const KLUCZ_MOTYW = "cis-app:motyw";

const TYTULY: [string, string, string][] = [
  ["/uczestnicy", "Uczestnicy", "Baza osób w projekcie CIS"],
  ["/sciezki", "Ścieżki IŚR", "Indywidualne ścieżki reintegracji"],
  ["/obecnosci", "Obecności", "Frekwencja w bieżącym tygodniu"],
  ["/harmonogram", "Harmonogram", "Plan zajęć i warsztatów"],
  ["/dokumenty", "Dokumenty", "Generator dokumentacji projektowej"],
  ["/", "Pulpit", "Przegląd projektu i dzisiejsze działania"],
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ciemny, setCiemny] = useState(false);

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
    if (e.key === "Enter" && q.trim()) {
      router.push(`/uczestnicy?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <header className="z-[2] flex shrink-0 items-center gap-5 border-b border-line bg-panel px-[34px] py-[19px]">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 font-serif text-[27px] font-semibold leading-[1.05] text-ink-strong">
          {tytul}
        </h1>
        <p className="m-0 mt-1 text-sm text-muted">{podtytul}</p>
      </div>
      <label className="flex w-[248px] items-center gap-[9px] rounded-xl border border-line-strong bg-surface px-3.5 py-[9px] transition-[border-color,box-shadow] duration-200 focus-within:border-[oklch(0.62_0.09_152)] focus-within:shadow-[0_0_0_3px_oklch(0.55_0.09_152/0.12)]">
        <span className="material-symbols-rounded notranslate text-[20px] text-faint">
          search
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={szukaj}
          placeholder="Szukaj uczestnika…"
          className="w-full border-none bg-transparent text-sm text-ink outline-none"
        />
      </label>
      <button
        onClick={przelaczMotyw}
        className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-mid transition-colors duration-200 hover:bg-soft"
        title={ciemny ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      >
        <span className="material-symbols-rounded notranslate text-[22px]">
          {ciemny ? "light_mode" : "dark_mode"}
        </span>
      </button>
      <button
        className="relative flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-mid transition-colors duration-200 hover:bg-soft"
        title="Powiadomienia"
      >
        <span className="material-symbols-rounded notranslate text-[22px]">
          notifications
        </span>
        <span className="absolute right-[10px] top-[9px] h-2 w-2 rounded-full border-2 border-surface bg-[oklch(0.62_0.12_60)]" />
      </button>
    </header>
  );
}
