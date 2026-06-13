"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/** Panel zalogowanego użytkownika w stopce menu + wylogowanie. */
export default function PanelUzytkownika() {
  const [email, setEmail] = useState<string | null>(null);
  const [nazwa, setNazwa] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return; // brak konfiguracji Supabase — tryb bez logowania
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? null);
      const meta = u.user_metadata ?? {};
      setNazwa(
        (meta.full_name as string) ||
          (meta.name as string) ||
          (u.email ? u.email.split("@")[0] : null),
      );
    });
  }, []);

  const inicjaly = (nazwa ?? email ?? "?")
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="mt-auto flex items-center gap-[11px] rounded-[14px] border border-line bg-soft p-[11px]">
      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[oklch(0.55_0.08_200)] text-sm font-bold text-white">
        {inicjaly || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">
          {nazwa ?? "Niezalogowany"}
        </div>
        <div className="truncate text-[11.5px] text-muted">
          {email ?? "kadra projektu"}
        </div>
      </div>
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
