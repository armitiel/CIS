"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dodajPracownika,
  pobierzMojeUprawnienia,
  pobierzZespol,
  zmienPracownika,
  type CzlonekZespolu,
  type RolaDostepu,
} from "@/lib/db-zespol";

export default function Pracownicy() {
  const [zespol, setZespol] = useState<CzlonekZespolu[]>([]);
  const [administrator, setAdministrator] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [rola, setRola] = useState<RolaDostepu>("pracownik");
  const [trwa, setTrwa] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);

  const odswiez = useCallback(async () => {
    setBlad(null);
    try {
      const moje = await pobierzMojeUprawnienia();
      const admin = moje?.aktywny === true && moje.rola === "administrator";
      setAdministrator(admin);
      setZespol(admin ? await pobierzZespol() : moje ? [moje] : []);
    } catch (e) {
      setAdministrator(false);
      setBlad(e instanceof Error ? e.message : "Nie udalo sie pobrac listy pracownikow.");
    }
  }, []);

  useEffect(() => {
    void odswiez();
  }, [odswiez]);

  async function dodaj() {
    setTrwa(true);
    setBlad(null);
    setKomunikat(null);
    try {
      await dodajPracownika(email, rola, nazwa);
      setEmail("");
      setNazwa("");
      setRola("pracownik");
      await odswiez();
      setKomunikat("Dodano pracownika. Moze teraz zalogowac sie swoim kontem Google.");
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udalo sie dodac pracownika.");
    } finally {
      setTrwa(false);
    }
  }

  async function zmien(
    emailPracownika: string,
    zmiany: Parameters<typeof zmienPracownika>[1],
  ) {
    setTrwa(true);
    setBlad(null);
    setKomunikat(null);
    try {
      await zmienPracownika(emailPracownika, zmiany);
      await odswiez();
      setKomunikat("Zapisano zmiane dostepu.");
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udalo sie zmienic dostepu.");
    } finally {
      setTrwa(false);
    }
  }

  const pole =
    "w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div className="flex max-w-4xl flex-col gap-[18px]">
      <section className="card anim-card-in px-6 py-[22px]">
        <h1 className="m-0 font-serif text-[24px] font-semibold text-ink-strong">
          Pracownicy
        </h1>
        <p className="mt-1 text-sm text-muted">
          Osoby z aktywnym dostepem widza te same projekty, uczestnikow,
          dokumenty i harmonogramy.
        </p>

        {administrator === false && (
          <div className="mt-4 rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">
            Tylko administrator moze dodawac pracownikow i zmieniac ich
            uprawnienia.
          </div>
        )}

        {administrator && (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <label className="th-label mb-1 block">Imie i nazwisko</label>
              <input
                value={nazwa}
                onChange={(e) => setNazwa(e.target.value)}
                className={pole}
                placeholder="np. Anna Kowalska"
              />
            </div>
            <div>
              <label className="th-label mb-1 block">Adres e-mail konta Google</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={pole}
                placeholder="pracownik@firma.pl"
                type="email"
              />
            </div>
            <div>
              <label className="th-label mb-1 block">Uprawnienie</label>
              <select
                value={rola}
                onChange={(e) => setRola(e.target.value as RolaDostepu)}
                className={pole}
              >
                <option value="pracownik">Pracownik - praca na danych projektowych</option>
                <option value="administrator">Administrator - takze zarzadzanie dostepem</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={dodaj}
                disabled={trwa || !email.trim()}
                className="btn-primary disabled:opacity-50"
              >
                <span className="material-symbols-rounded notranslate text-[18px]">person_add</span>
                Dodaj pracownika
              </button>
            </div>
          </div>
        )}

        {(komunikat || blad) && (
          <div
            className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
              blad ? "bg-red-soft text-red-ink" : "bg-green-soft text-primary-strong"
            }`}
          >
            {blad ?? komunikat}
          </div>
        )}
      </section>

      <section className="card anim-card-in overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
            Dostep do aplikacji ({zespol.length})
          </h2>
        </div>
        <div className="divide-y divide-line-soft">
          {zespol.map((osoba) => (
            <div
              key={osoba.email}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink">
                  {osoba.nazwa || osoba.email.split("@")[0]}
                </div>
                <div className="break-all text-xs text-muted">{osoba.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {administrator ? (
                  <>
                    <select
                      value={osoba.rola}
                      disabled={trwa}
                      onChange={(e) =>
                        void zmien(osoba.email, { rola: e.target.value as RolaDostepu })
                      }
                      className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
                      aria-label={`Rola ${osoba.email}`}
                    >
                      <option value="pracownik">Pracownik</option>
                      <option value="administrator">Administrator</option>
                    </select>
                    <button
                      disabled={trwa}
                      onClick={() => void zmien(osoba.email, { aktywny: !osoba.aktywny })}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                        osoba.aktywny
                          ? "bg-green-soft text-primary-strong"
                          : "bg-red-soft text-red-ink"
                      }`}
                    >
                      {osoba.aktywny ? "Dostep aktywny" : "Dostep wylaczony"}
                    </button>
                  </>
                ) : (
                  <span className="rounded-xl bg-soft px-3 py-2 text-sm text-ink-mid">
                    {osoba.rola === "administrator" ? "Administrator" : "Pracownik"}
                  </span>
                )}
              </div>
            </div>
          ))}
          {administrator !== null && zespol.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-muted">
              Brak wpisow zespolu.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
