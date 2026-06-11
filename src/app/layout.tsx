import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { ProjektProvider } from "@/components/ProjektProvider";

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "CIS Świebodzin — panel obsługi",
  description:
    "Aplikacja do obsługi Centrum Integracji Społecznej w Świebodzinie — Stowarzyszenie na Rzecz Edukacji „Pomost”",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${hanken.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=block"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var m=localStorage.getItem("cis-app:motyw");if(m)document.documentElement.dataset.theme=m;}catch(e){}',
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ProjektProvider>
          <div className="flex h-screen w-full overflow-hidden">
            <Sidebar />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <Header />
              <div className="flex-1 overflow-y-auto px-[34px] pb-16 pt-7">
                {children}
              </div>
            </main>
          </div>
        </ProjektProvider>
      </body>
    </html>
  );
}
