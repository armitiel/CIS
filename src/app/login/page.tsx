"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function Login() {
  const [bladKonfig, setBladKonfig] = useState(false);
  const [trwa, setTrwa] = useState(false);
  const [bladUrl, setBladUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [magicWyslany, setMagicWyslany] = useState(false);
  const [magicBlad, setMagicBlad] = useState<string | null>(null);

  // odczytaj ewentualny błąd przekazany przez /auth/callback
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const blad = p.get("blad");
    if (!blad) return;
    const msg = p.get("msg");
    if (blad === "auth")
      setBladUrl(
        msg ? decodeURIComponent(msg) : "Wymiana kodu nie powiodła się.",
      );
    else if (blad === "brak-kodu")
      setBladUrl("Google nie zwrócił kodu autoryzacji.");
    else if (blad === "brak-konfiguracji")
      setBladUrl("Brak zmiennych Supabase na serwerze (env).");
  }, []);

  async function zalogujGoogle() {
    setTrwa(true);
    setBladKonfig(false);
    try {
      const supabase = createClient();
      if (!supabase) {
        setBladKonfig(true);
        setTrwa(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // zawsze pokaż wybór konta Google (nie loguj automatycznie na ostatnie)
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setBladKonfig(true);
        setTrwa(false);
      }
      // przy powodzeniu następuje przekierowanie do Google
    } catch {
      setBladKonfig(true);
      setTrwa(false);
    }
  }

  // Logowanie zwykłym e-mailem — link do zalogowania (magic link, bez hasła).
  async function zalogujMailem() {
    const adres = email.trim().toLowerCase();
    if (!adres || !adres.includes("@")) {
      setMagicBlad("Wpisz poprawny adres e-mail.");
      return;
    }
    setTrwa(true);
    setMagicBlad(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setBladKonfig(true);
        setTrwa(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: adres,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setTrwa(false);
      if (error) setMagicBlad(error.message);
      else setMagicWyslany(true);
    } catch {
      setTrwa(false);
      setMagicBlad("Nie udało się wysłać linku. Spróbuj ponownie.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="card anim-card-in w-full max-w-sm p-8 text-center">
        <div
          className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-primary text-white"
          style={{ boxShadow: "0 6px 15px oklch(0.52 0.09 152 / 0.32)" }}
        >
          <span className="material-symbols-rounded notranslate text-[32px]">
            eco
          </span>
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink-strong">
          CIS Świebodzin
        </h1>
        <p className="mt-1 text-sm text-muted">
          Panel obsługi — Stowarzyszenie „Pomost”
        </p>

        <button
          onClick={zalogujGoogle}
          disabled={trwa}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-soft disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          {trwa ? "Przekierowanie…" : "Zaloguj się przez Google"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" />
          albo
          <span className="h-px flex-1 bg-line" />
        </div>

        {magicWyslany ? (
          <div className="rounded-lg bg-green-soft px-3 py-3 text-sm text-primary-strong">
            Wysłaliśmy link na <b>{email.trim().toLowerCase()}</b>. Otwórz
            skrzynkę i kliknij link, aby się zalogować (sprawdź też folder SPAM).
          </div>
        ) : (
          <div className="text-left">
            <label className="th-label mb-1 block">
              Zaloguj się e-mailem (bez hasła)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
            />
            <button
              onClick={zalogujMailem}
              disabled={trwa}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                mail
              </span>
              {trwa ? "Wysyłanie…" : "Wyślij link na e-mail"}
            </button>
            {magicBlad && (
              <p className="mt-2 rounded-lg bg-amber-soft px-3 py-2 text-xs text-amber-ink">
                {magicBlad}
              </p>
            )}
          </div>
        )}

        {bladUrl && (
          <p className="mt-4 break-words rounded-lg bg-amber-soft px-3 py-2 text-left text-xs text-amber-ink">
            Błąd logowania: {bladUrl}
          </p>
        )}

        {bladKonfig && (
          <p className="mt-4 rounded-lg bg-amber-soft px-3 py-2 text-left text-xs text-amber-ink">
            Logowanie Google nie jest jeszcze skonfigurowane w Supabase.
            Włącz dostawcę Google w panelu Supabase (Authentication →
            Providers) i dodaj adresy przekierowań — instrukcja w README.
          </p>
        )}

        <p className="mt-6 text-xs text-faint">
          Dostęp wyłącznie dla kadry projektu. Dane uczestników podlegają
          ochronie (RODO).
        </p>
      </div>
    </div>
  );
}
