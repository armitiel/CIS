import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CIS Świebodzin — panel obsługi",
  description:
    "Aplikacja do obsługi Centrum Integracji Społecznej w Świebodzinie — Stowarzyszenie na Rzecz Edukacji „Pomost”",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
