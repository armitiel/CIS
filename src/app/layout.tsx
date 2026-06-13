import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          <AppShell>{children}</AppShell>
        </ProjektProvider>
      </body>
    </html>
  );
}
