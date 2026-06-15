"use client";

// Profil koordynatora: edycja nazwy wyświetlanej i roli, podgląd e-maila,
// lista własnych projektów oraz wylogowanie.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProjekt } from "@/components/ProjektProvider";
import { useKoordynator } from "@/lib/use-koordynator";
import { ROLE_KOORDYNATORA, zapiszProfil } from "@/lib/db-profil";

export default function Profil() {
  const { projekty } = useProjekt();
  const { nazwa, rola, email, laduje, zalogowany, odswiez } = useKoordynator();

  const [nazwaIn, setNazwaIn] = useState("");
  const [rolaIn, setRolaIn] = useState("");
  const [zapisuje, setZapisuje] = useState(false);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [blad, setBlad] = useState<string | null>(null);

  useEffect(() => {
    setNazwaIn(nazwa);
    setRolaIn(rola);
  }, [nazwa, rola]);

  const inicjaly = (nazwaIn || email || "?")
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  async function zapisz() {
    setZapisuje(true);
    setKomunikat(null);
    setBlad(null);
    try {
      await zapiszProfil(nazwaIn, rolaIn);
      await odswiez();
      setKomunikat("✓ Zapisano profil.");
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się zapisać profilu.");
    } finally {
      setZapisuje(false);
    }
  }

  const pole =
    "w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div className="flex max-w-3xl flex-col gap-[18px]">
      <section className="card anim-card-in px-6 py-[22px]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[oklch(0.55_0.08_200)] text-xl font-bold text-white">
            {inicjaly || "?"}
          </div>
          <div className="min-w-0">
            <h1 className="m-0 font-serif text-[24px] font-semibold leading-tight text-ink-strong">
              {nazwaIn || "Koordynator"}
            </h1>
            <p className="m-0 mt-0.5 text-sm text-muted">
              {rolaIn || "Kadra projektu"}
              {email && ` · ${email}`}
            </p>
          </div>
        </div>

        {!laduje && !zalogowany && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-soft px-4 py-3 text-sm text-ink-mid">
            <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-blue-ink">
              info
            </span>
            <span>
              Edycja profilu wymaga zalogowania (baza online). Dane są wtedy
              zapisywane przy Twoim koncie.
            </span>
          </div>
        )}

        {zalogowany && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="th-label mb-1 block">Nazwa wyświetlana</label>
              <input
                value={nazwaIn}
                onChange={(e) => setNazwaIn(e.target.value)}
                placeholder="Imię i nazwisko"
                className={pole}
              />
            </div>
            <div>
              <label className="th-label mb-1 block">Rola</label>
              <select
                value={ROLE_KOORDYNATORA.includes(rolaIn as never) ? rolaIn : ""}
                onChange={(e) => setRolaIn(e.target.value)}
                className={`${pole} cursor-pointer`}
              >
                <option value="">— wybierz rolę —</option>
                {ROLE_KOORDYNATORA.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="th-label mb-1 block">E-mail (z logowania)</label>
              <input value={email} disabled className={`${pole} opacity-60`} />
            </div>
          </div>
        )}

        {(komunikat || blad) && (
          <div
            className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
              blad ? "bg-red-soft text-red-ink" : "bg-green-soft text-primary-strong"
            }`}
          >
            {blad ?? komunikat}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {zalogowany ? (
            <button
              onClick={zapisz}
              disabled={zapisuje}
              className="btn-primary disabled:opacity-50"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                save
              </span>
              {zapisuje ? "Zapisuję…" : "Zapisz profil"}
            </button>
          ) : (
            <span />
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-4 py-2 text-[13.5px] font-semibold text-red-ink transition-colors hover:bg-red-soft/40"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                logout
              </span>
              Wyloguj się
            </button>
          </form>
        </div>
      </section>

      <section className="card anim-card-in px-6 py-[22px]">
        <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
          Moje projekty ({projekty.length})
        </h2>
        <div className="mt-3 flex flex-col divide-y divide-line-soft">
          {projekty.map((p) => (
            <Link
              key={p.id}
              href="/projekty"
              className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary-strong"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {p.skrot}
                </span>
                <span className="block truncate text-xs text-faint">
                  {p.nabor}
                </span>
              </span>
              <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-faint">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
