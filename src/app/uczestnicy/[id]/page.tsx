"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useProjekt } from "@/components/ProjektProvider";
import { brakiWTeczce } from "@/lib/projekt-spec";
import { najblizszeZadania } from "@/lib/mock-data";
import {
  Avatar,
  EtapBadge,
  SciezkaPill,
  StatusPill,
  Stepper,
} from "@/components/ui";
import TeczkaUczestnika from "@/components/TeczkaUczestnika";

export default function Kartoteka() {
  const { id } = useParams<{ id: string }>();
  const { projekt, uczestnicy } = useProjekt();
  const u = uczestnicy.find((x) => x.id === id);

  if (!u) {
    return (
      <div className="max-w-4xl">
        <div className="card p-6 text-sm text-muted">
          Nie znaleziono uczestnika w projekcie „{projekt.skrot}”.{" "}
          <Link href="/uczestnicy" className="font-semibold hover:underline">
            Wróć do listy
          </Link>
        </div>
      </div>
    );
  }

  const braki = brakiWTeczce(u, projekt.spec);
  const nazwa = `${u.imie} ${u.nazwisko}`;
  const frekKolor =
    u.frekwencja >= 80
      ? "text-primary-strong"
      : u.frekwencja >= 50
        ? "text-amber-ink"
        : "text-red-ink";

  return (
    <div className="flex max-w-4xl flex-col gap-[18px]">
      <nav className="text-sm text-muted">
        <Link href="/uczestnicy" className="hover:underline">
          Uczestnicy
        </Link>{" "}
        / {u.nazwisko} {u.imie}
      </nav>

      <header className="anim-card-in flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar nazwa={nazwa} size={56} />
          <div>
            <h1 className="m-0 font-serif text-[27px] font-semibold leading-[1.05] text-ink-strong">
              {u.nazwisko} {u.imie}
            </h1>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <SciezkaPill sciezka={u.sciezka} />
              cykl {u.cykl} · grupa {u.grupa} · projekt {projekt.skrot}
            </p>
          </div>
        </div>
        <StatusPill status={u.status} />
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-[18px]">
        <div className="card card-hover anim-card-in p-3.5 sm:p-5">
          <div className="mb-2 flex h-9 w-9 sm:mb-3 sm:h-11 sm:w-11 items-center justify-center rounded-[13px] bg-blue-soft">
            <span className="material-symbols-rounded notranslate text-[20px] sm:text-[25px] text-blue-ink">
              route
            </span>
          </div>
          <p className="m-0 text-sm text-muted">Ścieżka reintegracji</p>
          <p className="m-0 mt-1 font-serif text-[20px] sm:text-[26px] font-semibold text-ink-strong">
            IŚR + {u.sciezka}
          </p>
          <p className="m-0 mt-1 text-xs text-faint">
            przystąpienie: {u.dataPrzystapienia}
          </p>
        </div>
        <div
          className="card card-hover anim-card-in p-3.5 sm:p-5"
          style={{ animationDelay: "0.07s" }}
        >
          <div className="mb-2 flex h-9 w-9 sm:mb-3 sm:h-11 sm:w-11 items-center justify-center rounded-[13px] bg-green-soft">
            <span className="material-symbols-rounded notranslate text-[20px] sm:text-[25px] text-primary-strong">
              event_available
            </span>
          </div>
          <p className="m-0 text-sm text-muted">Frekwencja</p>
          <p
            className={`m-0 mt-1 font-serif text-[20px] sm:text-[26px] font-semibold ${
              u.status === "aktywny" ? frekKolor : "text-faint"
            }`}
          >
            {u.status === "aktywny" ? `${u.frekwencja}%` : "—"}
          </p>
          <p className="m-0 mt-1 text-xs text-faint">bieżący miesiąc</p>
        </div>
        <div
          className="card card-hover anim-card-in p-3.5 sm:p-5"
          style={{ animationDelay: "0.14s" }}
        >
          <div
            className={`mb-2 flex h-9 w-9 sm:mb-3 sm:h-11 sm:w-11 items-center justify-center rounded-[13px] ${
              braki.length === 0 ? "bg-green-soft" : "bg-amber-soft"
            }`}
          >
            <span
              className={`material-symbols-rounded notranslate text-[20px] sm:text-[25px] ${
                braki.length === 0 ? "text-primary-strong" : "text-amber-ink"
              }`}
            >
              {braki.length === 0 ? "folder" : "folder_off"}
            </span>
          </div>
          <p className="m-0 text-sm text-muted">Teczka dokumentów</p>
          {braki.length === 0 ? (
            <p className="m-0 mt-1 font-serif text-[20px] sm:text-[26px] font-semibold text-primary-strong">
              komplet
            </p>
          ) : (
            <>
              <p className="m-0 mt-1 font-serif text-[20px] sm:text-[26px] font-semibold text-amber-ink">
                braki: {braki.length}
              </p>
              <ul className="m-0 mt-1 list-none p-0 text-xs text-muted">
                {braki.map((d) => (
                  <li key={d.id}>
                    • {d.symbol} {d.nazwa}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
            Ścieżka reintegracji
          </h2>
          <EtapBadge etap={u.etapSciezki ?? 0} />
        </div>
        <Stepper etap={u.etapSciezki ?? 0} />
        <div className="mt-[22px] flex items-start gap-2.5 rounded-[13px] bg-soft px-[15px] py-[13px]">
          <span className="material-symbols-rounded notranslate shrink-0 text-[20px] text-primary">
            flag
          </span>
          <div>
            <div className="th-label mb-0.5 tracking-[0.04em]">
              Najbliższe zadanie
            </div>
            <div className="text-[13.5px] leading-[1.35] text-ink-mid">
              {najblizszeZadania[u.etapSciezki ?? 0]}
            </div>
          </div>
        </div>
      </section>

      {u.sowa && (
        <section
          className="card anim-card-in px-6 py-[22px]"
          style={{ animationDelay: "0.26s" }}
        >
          <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
            Dane SOWA
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Płeć", u.sowa.plec],
              ["Wiek przy przystąpieniu", u.sowa.wiek],
              ["Wykształcenie", u.sowa.wyksztalcenie],
              ["Status na rynku pracy", u.sowa.statusRynkuPracy],
              [
                "Adres",
                u.sowa.miejscowosc
                  ? `${u.sowa.miejscowosc}, gm. ${u.sowa.gmina ?? "—"}, ${u.sowa.kodPocztowy ?? ""}`
                  : undefined,
              ],
              ["DEGURBA", u.sowa.degurba],
              ["Telefon", u.sowa.telefon],
              ["E-mail", u.sowa.email],
            ]
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">
                    {String(v)}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.29s" }}
      >
        <h2 className="m-0 mb-4 font-serif text-[19px] font-semibold text-ink-strong">
          Teczka dokumentów
        </h2>
        <TeczkaUczestnika uczestnik={u} />
      </section>

      <section
        className="card anim-card-in px-6 py-[22px]"
        style={{ animationDelay: "0.32s" }}
      >
        <h2 className="m-0 font-serif text-[19px] font-semibold text-ink-strong">
          Historia pracy z uczestnikiem
        </h2>
        <p className="m-0 mt-2 text-sm text-muted">
          Wpisy kadry merytorycznej (psycholog, doradca, pracownik socjalny,
          trener, instruktor) pojawią się tutaj — moduł w budowie (etap E3).
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <button className="btn-dark">Edytuj dane</button>
        <span className="self-center text-xs text-faint">
          (edycja danych aktywna po podłączeniu bazy — etap E1)
        </span>
      </section>
    </div>
  );
}
