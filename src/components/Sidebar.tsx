"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const moduly = [
  { href: "/", label: "Pulpit", icon: "◫" },
  { href: "/uczestnicy", label: "Uczestnicy", icon: "👥" },
  { href: "/sciezki", label: "Ścieżki IŚR", icon: "🧭" },
  { href: "/obecnosci", label: "Obecności", icon: "✓" },
  { href: "/harmonogram", label: "Harmonogram", icon: "📅" },
  { href: "/dokumenty", label: "Dokumenty", icon: "📄" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-lg font-bold text-slate-800">CIS Świebodzin</p>
        <p className="text-xs text-slate-500">Stowarzyszenie „Pomost”</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {moduly.map((m) => {
          const active =
            m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                active
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="w-5 text-center" aria-hidden>
                {m.icon}
              </span>
              {m.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
        Wersja rozwojowa — dane testowe
      </div>
    </aside>
  );
}
