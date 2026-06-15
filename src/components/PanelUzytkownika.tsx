"use client";

import Link from "next/link";
import { useKoordynator } from "@/lib/use-koordynator";

/** Panel zalogowanego użytkownika w stopce menu — wejście w profil + wylogowanie. */
export default function PanelUzytkownika() {
  const { nazwa, rola, email } = useKoordynator();

  const inicjaly = (nazwa || email || "?")
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="mt-auto flex items-center gap-[11px] rounded-[14px] border border-line bg-soft p-[11px]">
      <Link
        href="/profil"
        className="flex min-w-0 flex-1 items-center gap-[11px]"
        title="Profil koordynatora"
      >
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[oklch(0.55_0.08_200)] text-sm font-bold text-white">
          {inicjaly || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold text-ink">
            {nazwa || "Niezalogowany"}
          </div>
          <div className="truncate text-[11.5px] text-muted">
            {rola || email || "kadra projektu"}
          </div>
        </div>
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-faint transition-colors hover:bg-surface hover:text-ink"
          title="Wyloguj się"
          aria-label="Wyloguj się"
        >
          <span className="material-symbols-rounded notranslate text-[20px]">
            logout
          </span>
        </button>
      </form>
    </div>
  );
}
