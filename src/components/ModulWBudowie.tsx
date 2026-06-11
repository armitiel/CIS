export default function ModulWBudowie({
  tytul,
  opis,
  etap,
  funkcje,
}: {
  tytul: string;
  opis: string;
  etap: string;
  funkcje: string[];
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{tytul}</h1>
        <p className="text-sm text-slate-500">{opis}</p>
      </header>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <p className="font-semibold text-slate-700">
          Moduł w przygotowaniu ({etap})
        </p>
        <p className="mt-1 text-sm text-slate-500">Zaplanowane funkcje:</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {funkcje.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-blue-500" aria-hidden>
                •
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
