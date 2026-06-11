import Link from "next/link";
import { notFound } from "next/navigation";
import { uczestnicy } from "@/lib/mock-data";
import { brakiWTeczce } from "@/lib/projekt-spec";
import StatusBadge from "@/components/StatusBadge";
import FrekwencjaBadge from "@/components/FrekwencjaBadge";

export function generateStaticParams() {
  return uczestnicy.map((u) => ({ id: u.id }));
}

export default async function Kartoteka({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = uczestnicy.find((x) => x.id === id);
  if (!u) notFound();

  const braki = brakiWTeczce(u);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/uczestnicy" className="hover:underline">
          Uczestnicy
        </Link>{" "}
        / {u.nazwisko} {u.imie}
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {u.nazwisko} {u.imie}
          </h1>
          <p className="text-sm text-slate-500">
            {u.kategoria === "bezrobotny"
              ? "Osoba bezrobotna — uczestnik CIS"
              : "Osoba bierna zawodowo"}{" "}
            · cykl {u.cykl} · grupa {u.grupa}
          </p>
        </div>
        <StatusBadge status={u.status} />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Ścieżka reintegracji</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            IŚR + {u.sciezka}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            przystąpienie: {u.dataPrzystapienia}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Frekwencja</p>
          <p className="mt-1 text-2xl">
            {u.status === "aktywny" ? (
              <FrekwencjaBadge value={u.frekwencja} />
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">bieżący miesiąc</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Teczka dokumentów</p>
          {braki.length === 0 ? (
            <p className="mt-1 text-2xl font-bold text-green-700">komplet</p>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                braki: {braki.length}
              </p>
              <ul className="mt-1 text-xs text-slate-500">
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

      {u.sowa && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-700">Dane SOWA</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Płeć", u.sowa.plec],
              ["Wiek przy przystąpieniu", u.sowa.wiek],
              ["Wykształcenie", u.sowa.wyksztalcenie],
              ["Status na rynku pracy", u.sowa.statusRynkuPracy],
              [
                "Adres",
                u.sowa.miejscowosc
                  ? `${u.sowa.miejscowosc}, gm. ${u.sowa.gmina}, ${u.sowa.kodPocztowy}`
                  : undefined,
              ],
              ["DEGURBA", u.sowa.degurba],
            ]
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-700">{String(v)}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-700">
          Historia pracy z uczestnikiem
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Wpisy kadry merytorycznej (psycholog, doradca, pracownik socjalny,
          trener, instruktor) pojawią się tutaj — moduł w budowie (etap E3).
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/dokumenty"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Generuj dokumenty (moduł Dokumenty)
        </Link>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Edytuj dane
        </button>
        <span className="self-center text-xs text-slate-400">
          (edycja danych aktywna po podłączeniu bazy — etap E1)
        </span>
      </section>
    </div>
  );
}
