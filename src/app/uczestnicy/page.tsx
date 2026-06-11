"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { uczestnicy } from "@/lib/mock-data";
import StatusBadge from "@/components/StatusBadge";
import FrekwencjaBadge from "@/components/FrekwencjaBadge";
import { brakiWTeczce } from "@/lib/projekt-spec";
import type { KategoriaUczestnika } from "@/lib/types";

type FiltrKategorii = "wszyscy" | KategoriaUczestnika;

export default function Uczestnicy() {
  const [szukaj, setSzukaj] = useState("");
  const [kategoria, setKategoria] = useState<FiltrKategorii>("wszyscy");

  const widoczni = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    return uczestnicy.filter((u) => {
      if (kategoria !== "wszyscy" && u.kategoria !== kategoria) return false;
      if (q && !`${u.imie} ${u.nazwisko}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [szukaj, kategoria]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Uczestnicy</h1>
          <p className="text-sm text-slate-500">
            Kartoteki uczestników projektu — cykl I
          </p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          title="Formularz dodawania — etap E1"
        >
          + Dodaj uczestnika
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={szukaj}
          onChange={(e) => setSzukaj(e.target.value)}
          placeholder="Szukaj po imieniu i nazwisku…"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ["wszyscy", "Wszyscy"],
              ["bezrobotny", "Bezrobotni (IPZS)"],
              ["bierny", "Bierni zawodowo (IPR)"],
            ] as [FiltrKategorii, string][]
          ).map(([wart, label]) => (
            <button
              key={wart}
              onClick={() => setKategoria(wart)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                kategoria === wart
                  ? "bg-white font-semibold text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Uczestnik</th>
              <th className="px-4 py-3 font-medium">Ścieżka</th>
              <th className="px-4 py-3 font-medium">Grupa</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Frekwencja</th>
              <th className="px-4 py-3 font-medium">Dokumenty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {widoczni.map((u) => (
              <tr key={u.id} className="hover:bg-blue-50/40">
                <td className="px-5 py-3">
                  <Link
                    href={`/uczestnicy/${u.id}`}
                    className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                  >
                    {u.nazwisko} {u.imie}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.sciezka}</td>
                <td className="px-4 py-3 text-slate-600">{u.grupa}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3">
                  {u.status === "aktywny" ? (
                    <FrekwencjaBadge value={u.frekwencja} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {brakiWTeczce(u).length === 0 ? (
                    <span className="text-sm text-green-700">komplet</span>
                  ) : (
                    <span className="text-sm font-medium text-amber-700">
                      braki: {brakiWTeczce(u).length}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {widoczni.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Brak wyników dla podanych filtrów.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Dane testowe (fikcyjne) w strukturze SOWA. Eksport CSV do SOWA oraz
        walidacja PESEL/TERYT — etap E1.
      </p>
    </div>
  );
}
