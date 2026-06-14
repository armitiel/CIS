"use client";

// Powłoka aplikacji: zarządza chowanym menu bocznym na urządzeniach mobilnych.
// Desktop (md+): menu stale widoczne. Mobile: menu wysuwane z hamburgera + overlay.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PulpitTlo from "@/components/PulpitTlo";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOtwarte, setMenuOtwarte] = useState(false);
  const pathname = usePathname();

  // zamknij menu po przejściu na inną stronę (klik w pozycję menu na mobile)
  useEffect(() => {
    setMenuOtwarte(false);
  }, [pathname]);

  // zablokuj przewijanie tła, gdy menu otwarte na mobile
  useEffect(() => {
    document.body.style.overflow = menuOtwarte ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOtwarte]);

  // strona logowania renderuje się bez powłoki (menu/nagłówek)
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar otwarte={menuOtwarte} onZamknij={() => setMenuOtwarte(false)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenu={() => setMenuOtwarte(true)} />
        <div className="relative flex-1 overflow-hidden">
          {pathname === "/" && <PulpitTlo />}
          <div className="relative z-10 h-full overflow-y-auto px-4 pb-16 pt-5 sm:px-6 lg:px-[34px] lg:pt-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
