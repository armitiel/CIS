"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjekt } from "@/components/ProjektProvider";
import WyborProjektu from "@/components/WyborProjektu";
import PanelUzytkownika from "@/components/PanelUzytkownika";

const moduly = [
  { href: "/", label: "Pulpit", icon: "space_dashboard" },
  { href: "/uczestnicy", label: "Uczestnicy", icon: "groups" },
  { href: "/sciezki", label: "Ścieżki IŚR", icon: "route" },
  { href: "/obecnosci", label: "Obecności", icon: "fact_check" },
  { href: "/harmonogram", label: "Harmonogram", icon: "calendar_month" },
  { href: "/grafik-kadry", label: "Grafik kadry", icon: "badge" },
  { href: "/dokumenty", label: "Dokumenty", icon: "folder_open" },
  { href: "/projekty", label: "Projekty", icon: "workspaces" },
  { href: "/pracownicy", label: "Pracownicy", icon: "manage_accounts" },
];

export default function Sidebar({
  otwarte = false,
  onZamknij,
}: {
  otwarte?: boolean;
  onZamknij?: () => void;
}) {
  const pathname = usePathname();
  const { projekt } = useProjekt();

  return (
    <>
      {/* przyciemnienie tła na mobile, gdy menu otwarte */}
      <div
        onClick={onZamknij}
        className={`fixed inset-0 z-40 bg-[oklch(0.2_0.02_150/0.45)] transition-opacity duration-200 lg:hidden ${
          otwarte ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] shrink-0 flex-col overflow-y-auto border-r border-line bg-panel px-4 py-[22px] transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          otwarte ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
      <WyborProjektu />

      <div className="th-label px-3 pb-2">Moduły</div>
      <nav className="flex flex-col gap-[3px]">
        {moduly.map((m) => {
          const active =
            m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              onClick={onZamknij}
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

      <PanelUzytkownika />
      </aside>
    </>
  );
}
