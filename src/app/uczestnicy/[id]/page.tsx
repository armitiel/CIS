import Link from "next/link";
import { notFound } from "next/navigation";
import { uczestnicy } from "@/lib/mock-data";
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
          {u.brakujaceDokumenty.length === 0 ? (
            <p className="mt-1 text-2xl font-bold text-green-700">komplet</p>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                braki: {u.brakujaceDokumenty.length}
              </p>
              <ul className="mt-1 text-xs text-slate-500">
                {u.brakujaceDokumenty.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

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
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Generuj pakiet dokumentów
        </button>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Edytuj dane
        </button>
        <span className="self-center text-xs text-slate-400">
          (akcje aktywne po podłączeniu bazy — etap E1/E5)
        </span>
      </section>
    </div>
  );
}
