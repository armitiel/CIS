"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjekt } from "@/components/ProjektProvider";

const moduly = [
  { href: "/", label: "Pulpit", icon: "space_dashboard" },
  { href: "/uczestnicy", label: "Uczestnicy", icon: "groups" },
  { href: "/sciezki", label: "Ścieżki IŚR", icon: "route" },
  { href: "/obecnosci", label: "Obecności", icon: "fact_check" },
  { href: "/harmonogram", label: "Harmonogram", icon: "calendar_month" },
  { href: "/dokumenty", label: "Dokumenty", icon: "folder_open" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { projekt, projekty, zmienProjekt } = useProjekt();

  return (
    <aside className="flex w-[250px] shrink-0 flex-col border-r border-line bg-panel px-4 py-[22px]">
      <div className="flex items-center gap-3 px-2 pb-6 pt-1.5">
        <div
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-primary text-white"
          style={{ boxShadow: "0 6px 15px oklch(0.52 0.09 152 / 0.32)" }}
        >
          <span className="material-symbols-rounded notranslate text-[25px]">eco</span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-serif text-lg font-semibold leading-[1.15] text-ink-strong">
            {projekt.skrot}
          </div>
          <div className="mt-px text-xs text-muted">
            Stowarzyszenie „Pomost”
          </div>
        </div>
      </div>

      <div className="th-label px-3 pb-2">Projekt</div>
      <select
        value={projekt.id}
        onChange={(e) => zmienProjekt(e.target.value)}
        className="mx-1 mb-4 w-[calc(100%-8px)] cursor-pointer rounded-xl border border-line-strong bg-surface px-3 py-[9px] text-[13.5px] font-semibold text-ink outline-none transition-colors hover:bg-soft"
        title="Przełącz projekt"
      >
        {projekty.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nazwa}
          </option>
        ))}
      </select>

      <div className="th-label px-3 pb-2">Moduły</div>
      <nav className="flex flex-col gap-[3px]">
        {moduly.map((m) => {
          const active =
            m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex w-full items-center gap-[13px] rounded-xl px-[13px] py-[11px] text-left text-[14.5px] transition-colors duration-200 ${
                active
                  ? "bg-green-soft font-bold text-primary-strong"
                  : "font-semibold text-ink-mid hover:bg-soft hover:text-ink"
              }`}
            >
              <span className="material-symbols-rounded notranslate text-[22px]">
                {m.icon}
              </span>
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-[11px] rounded-[14px] border border-line bg-soft p-[11px]">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[oklch(0.55_0.08_200)] text-sm font-bold text-white">
          NK
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold text-ink">
            Natalia Kruk
          </div>
          <div className="text-[11.5px] text-muted">Koordynator projektu</div>
        </div>
      </div>
    </aside>
  );
}
