import Link from "next/link";
import { alerty, dzisiejszeZajecia, limity, uczestnicy } from "@/lib/mock-data";
import { brakiWTeczce } from "@/lib/projekt-spec";

function Karta({
  tytul,
  wartosc,
  opis,
  href,
}: {
  tytul: string;
  wartosc: string;
  opis?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <p className="text-sm text-slate-500">{tytul}</p>
      <p className="mt-1 text-3xl font-bold text-slate-800">{wartosc}</p>
      {opis && <p className="mt-1 text-xs text-slate-400">{opis}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function Pulpit() {
  const aktywni = uczestnicy.filter((u) => u.status === "aktywny");
  const sredniaFrekwencja = Math.round(
    aktywni.reduce((s, u) => s + u.frekwencja, 0) / (aktywni.length || 1),
  );
  const niekompletne = uczestnicy.filter(
    (u) => brakiWTeczce(u).length > 0,
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Pulpit</h1>
        <p className="text-sm text-slate-500">
          Przegląd dnia — najważniejsze informacje w jednym miejscu
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Karta
          tytul="Uczestnicy aktywni"
          wartosc={`${aktywni.length}`}
          opis={`bezrobotni: ${limity.bezrobotni.zajete}/${limity.bezrobotni.limit} · bierni: ${limity.bierni.zajete}/${limity.bierni.limit}`}
          href="/uczestnicy"
        />
        <Karta
          tytul="Średnia frekwencja"
          wartosc={`${sredniaFrekwencja}%`}
          opis="aktywni uczestnicy, bieżący miesiąc"
          href="/obecnosci"
        />
        <Karta
          tytul="Niekompletne teczki"
          wartosc={`${niekompletne}`}
          opis="uczestnicy z brakami w dokumentach"
          href="/dokumenty"
        />
        <Karta
          tytul="Dzisiejsze zajęcia"
          wartosc={`${dzisiejszeZajecia.length}`}
          opis="zaplanowane na dziś"
          href="/harmonogram"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-700">
            Dzisiejsze zajęcia
          </h2>
          <ul className="divide-y divide-slate-100">
            {dzisiejszeZajecia.map((z) => (
              <li key={z.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-800">{z.nazwa}</p>
                  <p className="text-sm text-slate-500">
                    {z.prowadzacy} · grupa {z.grupa} · {z.sala}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-slate-600">
                  {z.godzina}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-700">
            Wymaga uwagi
          </h2>
          <ul className="divide-y divide-slate-100">
            {alerty.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    a.typ === "frekwencja"
                      ? "bg-red-500"
                      : a.typ === "dokumenty"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                  aria-hidden
                />
                <p className="text-sm text-slate-700">
                  {a.uczestnikId ? (
                    <Link
                      href={`/uczestnicy/${a.uczestnikId}`}
                      className="hover:underline"
                    >
                      {a.tresc}
                    </Link>
                  ) : (
                    a.tresc
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
