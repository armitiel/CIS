"use client";

// Grafik kadry + karty czasu pracy (etap E9).
// Widok „Grafik": siatka osoby × dni tygodnia — klikasz, kto kiedy pracuje
// (godziny od-do, zajęcia grupowe/indywidualne).
// Widok „Karty": miesięczne karty czasu pracy generowane z grafiku (wzór G-02).

import { useMemo, useState } from "react";
import { useProjekt } from "@/components/ProjektProvider";
import { useKadra } from "@/lib/use-kadra";
import { useGrafikKadry } from "@/lib/use-grafik-kadry";
import { liczbaGodzin, formatGodziny } from "@/lib/db-grafik-kadry";
import { generujKarteCzasu } from "@/lib/karta-czasu";
import { czySwieto, liczbaDniRoboczych } from "@/lib/swieta";
import KadraPanel from "@/components/KadraPanel";
import GrafikDzienPanel from "@/components/GrafikDzienPanel";
import WypelnijGrafikPanel from "@/components/WypelnijGrafikPanel";
import ImportGrafikuPanel from "@/components/ImportGrafikuPanel";

type Widok = "grafik" | "miesiac" | "karty";

const DNI_ROBOCZE = ["Pn", "Wt", "Śr", "Czw", "Pt"];
const DNI_KROTKIE = ["Pn", "Wt", "Śr", "Czw", "Pt", "So", "Nd"];
const MIESIACE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];
const MIESIACE_M = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function dzienTyg(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function poczatekTygodnia(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - dzienTyg(x));
  x.setHours(0, 0, 0, 0);
  return x;
}
function dodajDni(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function tenSamDzien(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoMiesiacaOd(d: Date): string {
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
}
function isoMiesiacaDo(d: Date): string {
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
/** Kategoria dnia wg wpisów: kolor tła + krótka etykieta.
 *  Grupowe i indywidualne są osobnymi wpisami; dzień z obydwoma jest oznaczany
 *  bursztynem (ale w karcie i tak liczą się oddzielnie). */
function kategoriaWpisow(wpisy: { typ: string }[]): { label: string; bg: string } {
  if (wpisy.length === 0) return { label: "", bg: "var(--color-soft)" };
  const grup = wpisy.some((w) => w.typ === "grupowe");
  const ind = wpisy.some((w) => w.typ === "indywidualne");
  if (grup && ind)
    return { label: "grup.+indyw.", bg: "var(--color-amber-soft)" };
  if (ind) return { label: "indyw.", bg: "var(--color-blue-soft)" };
  return { label: "grup.", bg: "var(--color-green-soft)" };
}

export default function GrafikKadry() {
  const { projekt } = useProjekt();
  const { kadra, zapisz: zapiszOsobe, usun: usunOsobe } = useKadra(projekt.id);
  const {
    grafik,
    zapisz: zapiszWpis,
    usun: usunWpis,
    usunOsobe: usunWpisyOsoby,
  } = useGrafikKadry(projekt.id);

  const dzis = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [widok, setWidok] = useState<Widok>("grafik");
  const [kotwica, setKotwica] = useState<Date>(dzis);
  const [pokazKadre, setPokazKadre] = useState(false);
  const [kadraEdytujId, setKadraEdytujId] = useState<string | null>(null);
  const [pokazWypelnij, setPokazWypelnij] = useState(false);
  const [pokazImport, setPokazImport] = useState(false);
  const [osobaMiesiacaId, setOsobaMiesiacaId] = useState<string>("");
  const [edycjaKomorki, setEdycjaKomorki] = useState<{
    kadraId: string;
    dataISO: string;
  } | null>(null);

  const aktywni = useMemo(() => kadra.filter((o) => o.aktywny), [kadra]);

  // wpisy danej osoby w danym dniu
  const wpisyDla = useMemo(() => {
    const mapa = new Map<string, typeof grafik>();
    for (const w of grafik) {
      const k = `${w.kadraId}|${w.data}`;
      const arr = mapa.get(k);
      if (arr) arr.push(w);
      else mapa.set(k, [w]);
    }
    return (kadraId: string, dataISO: string) =>
      mapa.get(`${kadraId}|${dataISO}`) ?? [];
  }, [grafik]);

  // Szybki wpis jednym kliknięciem — wg domyślnych godzin osoby.
  function szybkiWpis(o: (typeof aktywni)[number], dataISO: string) {
    zapiszWpis({
      kadraId: o.id,
      data: dataISO,
      godzinaOd: o.godzinaOd || "08:00",
      godzinaDo: o.godzinaDo || "16:00",
      typ: o.typDomyslny ?? "grupowe",
      zadanie: "",
    });
  }

  // Klik kratki: pusty dzień → szybki wpis; wypełniony → edytor dnia.
  function klikKomorke(o: (typeof aktywni)[number], dataISO: string) {
    if (wpisyDla(o.id, dataISO).length > 0) {
      setEdycjaKomorki({ kadraId: o.id, dataISO });
    } else {
      szybkiWpis(o, dataISO);
    }
  }

  function przesun(kierunek: 1 | -1) {
    if (widok === "grafik") setKotwica((k) => dodajDni(k, 7 * kierunek));
    else {
      setKotwica((k) => {
        const x = new Date(k);
        x.setDate(1);
        x.setMonth(x.getMonth() + kierunek);
        return x;
      });
    }
  }

  function usunOsobeIWpisy(id: string) {
    usunWpisyOsoby(id);
    usunOsobe(id);
  }

  const pon = poczatekTygodnia(kotwica);
  const pt = dodajDni(pon, 4);
  const dniRobMies = liczbaDniRoboczych(
    kotwica.getFullYear(),
    kotwica.getMonth(),
  );
  const etykieta =
    widok === "grafik"
      ? pon.getMonth() === pt.getMonth()
        ? `Tydzień ${pon.getDate()}–${pt.getDate()} ${MIESIACE[pt.getMonth()]} ${pt.getFullYear()}`
        : `Tydzień ${pon.getDate()} ${MIESIACE[pon.getMonth()]} – ${pt.getDate()} ${MIESIACE[pt.getMonth()]} ${pt.getFullYear()}`
      : `${MIESIACE_M[kotwica.getMonth()]} ${kotwica.getFullYear()}`;

  // ===== widok GRAFIK: wiersze osób z dniami tygodnia =====
  const wierszeGrafiku = useMemo(
    () =>
      aktywni.map((o) => {
        const dni = Array.from({ length: 5 }, (_, i) => {
          const data = dodajDni(pon, i);
          const wpisy = wpisyDla(o.id, iso(data));
          const godziny = wpisy.reduce(
            (s, w) => s + liczbaGodzin(w.godzinaOd, w.godzinaDo),
            0,
          );
          return { data, wpisy, godziny };
        });
        const sumaTyg = dni.reduce((s, d) => s + d.godziny, 0);
        return { o, dni, sumaTyg };
      }),
    [aktywni, pon, wpisyDla],
  );

  // ===== widok KARTY: zestawienie miesięczne per osoba =====
  const kartyMiesiaca = useMemo(() => {
    const rok = kotwica.getFullYear();
    const mc = kotwica.getMonth();
    const wMiesiacu = grafik.filter((w) => {
      const [y, m] = w.data.split("-").map(Number);
      return y === rok && m - 1 === mc;
    });
    const wiersze = aktywni.map((o) => {
      const wpisy = wMiesiacu.filter((w) => w.kadraId === o.id);
      const godziny = wpisy.reduce(
        (s, w) => s + liczbaGodzin(w.godzinaOd, w.godzinaDo),
        0,
      );
      return { o, liczbaWpisow: wpisy.length, godziny, wpisy };
    });
    const sumaGodzin = wiersze.reduce((s, w) => s + w.godziny, 0);
    return { rok, mc, wiersze, sumaGodzin };
  }, [aktywni, grafik, kotwica]);

  // ===== widok MIESIĄC (jedna osoba): kalendarz =====
  const osobaMies =
    aktywni.find((o) => o.id === osobaMiesiacaId) ?? aktywni[0];

  const tygodnieMiesiaca = useMemo(() => {
    const pierwszy = new Date(kotwica.getFullYear(), kotwica.getMonth(), 1);
    const start = poczatekTygodnia(pierwszy);
    const tygodnie: Date[][] = [];
    let d = start;
    do {
      tygodnie.push(Array.from({ length: 7 }, (_, i) => dodajDni(d, i)));
      d = dodajDni(d, 7);
    } while (d.getMonth() === kotwica.getMonth());
    return tygodnie;
  }, [kotwica]);

  const sumaMiesiacaOsoby = useMemo(() => {
    if (!osobaMies) return 0;
    const rok = kotwica.getFullYear();
    const mc = kotwica.getMonth();
    return grafik
      .filter((w) => {
        if (w.kadraId !== osobaMies.id) return false;
        const [y, m] = w.data.split("-").map(Number);
        return y === rok && m - 1 === mc;
      })
      .reduce((s, w) => s + liczbaGodzin(w.godzinaOd, w.godzinaDo), 0);
  }, [grafik, osobaMies, kotwica]);

  function wypelnijDniRoboczeMiesiaca() {
    if (!osobaMies) return;
    const rok = kotwica.getFullYear();
    const mc = kotwica.getMonth();
    const d = new Date(rok, mc, 1);
    while (d.getMonth() === mc) {
      const dow = d.getDay();
      if (
        dow >= 1 &&
        dow <= 5 &&
        !czySwieto(d) &&
        wpisyDla(osobaMies.id, iso(d)).length === 0
      ) {
        szybkiWpis(osobaMies, iso(d));
      }
      d.setDate(d.getDate() + 1);
    }
  }

  function pobierzKarte(o: (typeof kartyMiesiaca.wiersze)[number]) {
    generujKarteCzasu(
      projekt.spec,
      o.o,
      o.wpisy,
      kartyMiesiaca.rok,
      kartyMiesiaca.mc,
    );
  }

  async function pobierzWszystkie() {
    for (const w of kartyMiesiaca.wiersze) {
      if (w.liczbaWpisow === 0) continue;
      await generujKarteCzasu(
        projekt.spec,
        w.o,
        w.wpisy,
        kartyMiesiaca.rok,
        kartyMiesiaca.mc,
      );
    }
  }

  const WIDOKI: [Widok, string][] = [
    ["grafik", "Tydzień"],
    ["miesiac", "Miesiąc"],
    ["karty", "Karty"],
  ];

  const edytowanaOsoba = edycjaKomorki
    ? aktywni.find((o) => o.id === edycjaKomorki.kadraId)
    : undefined;

  return (
    <div className="flex max-w-[1100px] flex-col gap-[18px]">
      {/* Pasek nawigacji + przełącznik widoku */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => przesun(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Poprzedni"
          >
            <span className="material-symbols-rounded notranslate text-xl">
              chevron_left
            </span>
          </button>
          <button
            onClick={() => przesun(1)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-surface text-ink-mid transition-colors hover:bg-soft"
            title="Następny"
          >
            <span className="material-symbols-rounded notranslate text-xl">
              chevron_right
            </span>
          </button>
          <button
            onClick={() => setKotwica(dzis)}
            className="rounded-[10px] border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
          >
            Dziś
          </button>
          <span className="ml-2 flex items-center gap-[9px]">
            <span className="material-symbols-rounded notranslate text-[22px] text-primary">
              {widok === "karty" ? "description" : "badge"}
            </span>
            <span className="font-serif text-lg font-semibold text-ink-strong">
              {etykieta}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {kadra.length > 0 && widok !== "karty" && (
            <button
              onClick={() => setPokazWypelnij(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                event_repeat
              </span>
              Wypełnij grafik
            </button>
          )}
          <button
            onClick={() => setPokazImport(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
            title="Wczytaj plan z pliku Excel (Plan_pracy_kadry_CIS.xlsx)"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              upload_file
            </span>
            Import z Excela
          </button>
          <button
            onClick={() => setPokazKadre(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              group
            </span>
            Kadra ({kadra.length})
          </button>
          <div className="flex gap-1 rounded-xl bg-soft p-1">
            {WIDOKI.map(([w, label]) => (
              <button
                key={w}
                onClick={() => setWidok(w)}
                className={`rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
                  widok === w
                    ? "bg-surface text-ink-strong shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brak kadry — podpowiedź startowa */}
      {kadra.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="material-symbols-rounded notranslate text-[40px] text-faint">
            badge
          </span>
          <div className="text-sm text-muted">
            Najpierw dodaj osoby zatrudnione w projekcie. Potem będziesz klikać
            w siatce, kto kiedy pracuje.
          </div>
          <button
            onClick={() => setPokazKadre(true)}
            className="mt-1 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">
              person_add
            </span>
            Dodaj kadrę
          </button>
        </div>
      )}

      {/* ===== Widok: GRAFIK (siatka osoby × dni) ===== */}
      {kadra.length > 0 && widok === "grafik" && (
        <>
          <div className="card anim-card-in overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(76px,1fr))_92px] items-center gap-2 border-b border-line px-[22px] py-3.5">
              <div className="th-label">Osoba</div>
              {DNI_ROBOCZE.map((d, i) => {
                const data = dodajDni(pon, i);
                const dzisiaj = tenSamDzien(data, dzis);
                return (
                  <div
                    key={d}
                    className={`th-label text-center ${dzisiaj ? "text-primary-strong" : ""}`}
                  >
                    {d} {data.getDate()}
                  </div>
                );
              })}
              <div className="th-label text-right">Razem</div>
            </div>

            {wierszeGrafiku.map(({ o, dni, sumaTyg }, i) => (
              <div
                key={o.id}
                className="anim-card-in grid min-w-[640px] grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(76px,1fr))_92px] items-center gap-2 border-t border-line-soft px-[22px] py-2.5"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {o.imie} {o.nazwisko}
                  </div>
                  {o.stanowisko && (
                    <div className="truncate text-[11.5px] text-faint">
                      {o.stanowisko}
                    </div>
                  )}
                </div>
                {dni.map(({ data, wpisy, godziny }, di) => {
                  const ma = wpisy.length > 0;
                  const kat = kategoriaWpisow(wpisy);
                  return (
                    <div key={di} className="flex justify-center">
                      <button
                        onClick={() => klikKomorke(o, iso(data))}
                        title={
                          ma
                            ? wpisy
                                .map(
                                  (w) =>
                                    `${w.godzinaOd}–${w.godzinaDo} (${w.typ})`,
                                )
                                .join(", ") + " — kliknij, aby edytować"
                            : `Kliknij = szybki wpis ${o.godzinaOd}–${o.godzinaDo}`
                        }
                        className="flex h-[44px] w-full max-w-[72px] flex-col items-center justify-center rounded-[10px] border transition-all hover:ring-2 hover:ring-line-strong"
                        style={{
                          background: kat.bg,
                          borderColor: ma
                            ? "transparent"
                            : "var(--color-line-soft)",
                        }}
                      >
                        {ma ? (
                          <>
                            <span className="text-[12.5px] font-bold text-ink-strong leading-none">
                              {formatGodziny(godziny)}h
                            </span>
                            <span className="mt-0.5 text-[10px] font-semibold text-muted leading-none">
                              {kat.label}
                              {wpisy.length > 1 ? ` ·${wpisy.length}` : ""}
                            </span>
                          </>
                        ) : (
                          <span className="material-symbols-rounded notranslate text-[18px] text-faint">
                            add
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
                <div className="text-right text-[13.5px] font-bold text-ink-mid">
                  {sumaTyg > 0 ? `${formatGodziny(sumaTyg)} h` : "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-line-soft bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[14px] w-[14px] rounded-[4px] bg-green-soft" />
              zajęcia grupowe
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-[14px] w-[14px] rounded-[4px]"
                style={{ background: "var(--color-blue-soft)" }}
              />
              zajęcia indywidualne
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-[14px] w-[14px] rounded-[4px]"
                style={{ background: "var(--color-amber-soft)" }}
              />
              grupowe + indywidualne (osobno)
            </span>
            <span className="ml-auto">
              pusta kratka = szybki wpis · kratka z godzinami = edycja
            </span>
          </div>
        </>
      )}

      {/* ===== Widok: MIESIĄC (jedna osoba) ===== */}
      {kadra.length > 0 && widok === "miesiac" && osobaMies && (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-[14px]">
            <div className="flex items-center gap-2.5">
              <span className="th-label">Osoba</span>
              <select
                value={osobaMies.id}
                onChange={(e) => setOsobaMiesiacaId(e.target.value)}
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] font-semibold text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
              >
                {aktywni.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.imie} {o.nazwisko}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setKadraEdytujId(osobaMies.id);
                  setPokazKadre(true);
                }}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[12.5px] font-semibold text-ink-mid transition-colors hover:bg-soft"
                title={`Zmień godziny pracy: ${osobaMies.imie} ${osobaMies.nazwisko} (teraz ${formatGodziny(liczbaGodzin(osobaMies.godzinaOd, osobaMies.godzinaDo))} h/dzień)`}
              >
                <span className="material-symbols-rounded notranslate text-[16px]">
                  edit
                </span>
                {formatGodziny(liczbaGodzin(osobaMies.godzinaOd, osobaMies.godzinaDo))} h/dzień
              </button>
              {osobaMies.stanowisko && (
                <span className="hidden text-[12px] text-faint sm:inline">
                  {osobaMies.stanowisko}
                </span>
              )}
            </div>
            <button
              onClick={wypelnijDniRoboczeMiesiaca}
              className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-mid transition-colors hover:bg-soft"
              title={`Wypełnij wszystkie dni robocze godzinami ${osobaMies.godzinaOd}–${osobaMies.godzinaDo}`}
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                event_available
              </span>
              Wypełnij dni robocze
            </button>
          </div>

          <div className="card anim-card-in overflow-hidden">
            <div className="grid grid-cols-7 border-b border-line">
              {DNI_KROTKIE.map((d) => (
                <div key={d} className="th-label px-3 py-2.5 text-center">
                  {d}
                </div>
              ))}
            </div>
            {tygodnieMiesiaca.map((tydzien, ti) => (
              <div
                key={ti}
                className="grid grid-cols-7 border-t border-line-soft first:border-t-0"
              >
                {tydzien.map((data, di) => {
                  const wTymMiesiacu = data.getMonth() === kotwica.getMonth();
                  const wpisy = wTymMiesiacu
                    ? wpisyDla(osobaMies.id, iso(data))
                    : [];
                  const godziny = wpisy.reduce(
                    (s, w) => s + liczbaGodzin(w.godzinaOd, w.godzinaDo),
                    0,
                  );
                  const indyw =
                    wpisy.length > 0 &&
                    wpisy.every((w) => w.typ === "indywidualne");
                  const dzisiaj = tenSamDzien(data, dzis);
                  const weekend = di >= 5;
                  return (
                    <button
                      key={di}
                      disabled={!wTymMiesiacu}
                      onClick={() => klikKomorke(osobaMies, iso(data))}
                      className={`flex min-h-[72px] flex-col items-start gap-1 border-l border-line-soft p-2 text-left transition-colors first:border-l-0 ${
                        !wTymMiesiacu
                          ? "bg-app"
                          : weekend
                            ? "bg-app hover:bg-hover-row"
                            : "bg-surface hover:bg-hover-row"
                      }`}
                      title={
                        wTymMiesiacu
                          ? wpisy.length
                            ? wpisy
                                .map((w) => `${w.godzinaOd}–${w.godzinaDo}`)
                                .join(", ") + " — kliknij, aby edytować"
                            : `Kliknij = wpis ${osobaMies.godzinaOd}–${osobaMies.godzinaDo}`
                          : undefined
                      }
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-bold ${
                          dzisiaj
                            ? "bg-primary text-white"
                            : wTymMiesiacu
                              ? weekend
                                ? "text-faint"
                                : "text-ink-mid"
                              : "text-faint opacity-40"
                        }`}
                      >
                        {data.getDate()}
                      </span>
                      {godziny > 0 && (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                          style={{
                            background: indyw
                              ? "var(--color-blue-soft)"
                              : "var(--color-green-soft)",
                            color: "var(--color-ink-strong)",
                          }}
                        >
                          {formatGodziny(godziny)}h
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line bg-hover-row px-[22px] py-[15px]">
              <span className="text-[13.5px] text-muted">
                {osobaMies.imie} {osobaMies.nazwisko} — razem w{" "}
                {MIESIACE[kotwica.getMonth()]} {kotwica.getFullYear()}
              </span>
              <span className="font-serif text-xl font-bold text-primary-strong">
                {formatGodziny(sumaMiesiacaOsoby)} godz.
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line-soft bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
            Norma czasu pracy w {MIESIACE[kotwica.getMonth()]}: pełny etat 1/1 ={" "}
            <b className="text-ink">{formatGodziny(dniRobMies * 8)} h</b>{" "}
            ({dniRobMies} dni roboczych, bez świąt). Pełny wymiar dla{" "}
            {osobaMies.imie} {osobaMies.nazwisko}:{" "}
            <b className="text-ink">
              {formatGodziny(
                dniRobMies *
                  liczbaGodzin(osobaMies.godzinaOd, osobaMies.godzinaDo),
              )}{" "}
              h
            </b>
            .
          </div>

          <div className="rounded-xl border border-line-soft bg-surface px-3.5 py-2.5 text-[12.5px] text-muted">
            Kliknij dzień, aby dodać pracę wg domyślnych godzin osoby; kliknij
            dzień z wpisem, aby go edytować. „Wypełnij dni robocze” obejmie cały
            miesiąc jednym kliknięciem.
          </div>
        </>
      )}

      {/* ===== Widok: KARTY CZASU PRACY ===== */}
      {kadra.length > 0 && widok === "karty" && (
        <div className="card anim-card-in overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-3.5">
            <span className="th-label">
              Karty czasu pracy — {MIESIACE_M[kartyMiesiaca.mc]}{" "}
              {kartyMiesiaca.rok}
            </span>
            <button
              onClick={pobierzWszystkie}
              disabled={kartyMiesiaca.sumaGodzin === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <span className="material-symbols-rounded notranslate text-[18px]">
                download
              </span>
              Pobierz wszystkie
            </button>
          </div>

          <div className="grid min-w-[620px] grid-cols-[minmax(200px,1.6fr)_repeat(2,minmax(90px,0.8fr))_minmax(150px,1fr)] items-center gap-2 border-b border-line-soft px-[22px] py-2.5">
            <div className="th-label">Osoba</div>
            <div className="th-label text-center">Wpisy</div>
            <div className="th-label text-center">Godziny</div>
            <div className="th-label text-right">Karta</div>
          </div>

          {kartyMiesiaca.wiersze.map(({ o, liczbaWpisow, godziny }, i) => (
            <div
              key={o.id}
              className="anim-card-in grid min-w-[620px] grid-cols-[minmax(200px,1.6fr)_repeat(2,minmax(90px,0.8fr))_minmax(150px,1fr)] items-center gap-2 border-t border-line-soft px-[22px] py-[12px]"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {o.imie} {o.nazwisko}
                </div>
                {o.stanowisko && (
                  <div className="truncate text-[11.5px] text-faint">
                    {o.stanowisko}
                  </div>
                )}
              </div>
              <div className="text-center text-[13.5px] text-ink-mid">
                {liczbaWpisow}
              </div>
              <div className="text-center font-serif text-[15px] font-bold text-ink-strong">
                {formatGodziny(godziny)}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    pobierzKarte(
                      kartyMiesiaca.wiersze.find((w) => w.o.id === o.id)!,
                    )
                  }
                  disabled={liczbaWpisow === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-mid transition-colors hover:bg-soft disabled:opacity-40"
                >
                  <span className="material-symbols-rounded notranslate text-[16px]">
                    download
                  </span>
                  DOCX
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-line bg-hover-row px-[22px] py-[15px]">
            <span className="text-[13.5px] text-muted">
              Łącznie w {MIESIACE[kartyMiesiaca.mc]} {kartyMiesiaca.rok}
            </span>
            <span className="font-serif text-xl font-bold text-primary-strong">
              {formatGodziny(kartyMiesiaca.sumaGodzin)} godz.
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-faint">
        Karta czasu pracy odzwierciedla układ wzoru CIS/G-02. Liczba godzin
        wyliczana jest z różnicy „od–do”. Dane przed podpisem należy
        zweryfikować z faktycznym czasem pracy i regulaminem projektu.
      </p>

      {pokazKadre && (
        <KadraPanel
          kadra={kadra}
          onZapisz={zapiszOsobe}
          onUsun={usunOsobeIWpisy}
          edytujId={kadraEdytujId}
          onClose={() => {
            setPokazKadre(false);
            setKadraEdytujId(null);
          }}
        />
      )}

      {edycjaKomorki && edytowanaOsoba && (
        <GrafikDzienPanel
          osoba={edytowanaOsoba}
          dataISO={edycjaKomorki.dataISO}
          wpisy={wpisyDla(edycjaKomorki.kadraId, edycjaKomorki.dataISO)}
          onZapisz={zapiszWpis}
          onUsun={usunWpis}
          onClose={() => setEdycjaKomorki(null)}
        />
      )}

      {pokazWypelnij && (
        <WypelnijGrafikPanel
          kadra={aktywni}
          domyslnaOd={isoMiesiacaOd(kotwica)}
          domyslnaDo={isoMiesiacaDo(kotwica)}
          istnieje={(kadraId, dataISO) => wpisyDla(kadraId, dataISO).length > 0}
          onZapisz={zapiszWpis}
          onClose={() => setPokazWypelnij(false)}
        />
      )}

      {pokazImport && (
        <ImportGrafikuPanel
          kadra={kadra}
          grafik={grafik}
          onZapiszOsoba={zapiszOsobe}
          onZapiszWpis={zapiszWpis}
          onClose={() => setPokazImport(false)}
        />
      )}
    </div>
  );
}
