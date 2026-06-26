// Polskie dni ustawowo wolne od pracy (stałe + ruchome od Wielkanocy).
// Używane do automatyki etatu: pomijanie świąt przy wypełnianiu grafiku oraz
// wyliczania miesięcznej normy czasu pracy (dni robocze pon–pt bez świąt × 8 h).

function p2(n: number): string {
  return String(n).padStart(2, "0");
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Wielkanoc (niedziela) danego roku — algorytm Meeusa/Gaussa. */
function wielkanoc(rok: number): Date {
  const a = rok % 19;
  const b = Math.floor(rok / 100);
  const c = rok % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mc = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzec, 4=kwiecień
  const dzien = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(rok, mc - 1, dzien);
}

const cache = new Map<number, Set<string>>();

/** Zbiór dat (ISO) świąt ustawowo wolnych w danym roku. */
export function swietaRoku(rok: number): Set<string> {
  const z = cache.get(rok);
  if (z) return z;
  const stale: [number, number][] = [
    [1, 1], [1, 6], [5, 1], [5, 3], [8, 15], [11, 1], [11, 11], [12, 25], [12, 26],
  ];
  const s = new Set<string>();
  for (const [m, d] of stale) s.add(iso(new Date(rok, m - 1, d)));
  const w = wielkanoc(rok);
  const dodaj = (offset: number) => {
    const x = new Date(w);
    x.setDate(x.getDate() + offset);
    s.add(iso(x));
  };
  dodaj(0); // Wielkanoc (niedziela)
  dodaj(1); // Poniedziałek Wielkanocny
  dodaj(49); // Zielone Świątki
  dodaj(60); // Boże Ciało
  cache.set(rok, s);
  return s;
}

/** Czy dana data jest świętem ustawowo wolnym od pracy. */
export function czySwieto(d: Date): boolean {
  return swietaRoku(d.getFullYear()).has(iso(d));
}

/** Czy dzień roboczy: poniedziałek–piątek i nie święto. */
export function czyDzienRoboczy(d: Date): boolean {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5 && !czySwieto(d);
}

/** Liczba dni roboczych w miesiącu (mc: 0–11) z wykluczeniem świąt. */
export function liczbaDniRoboczych(rok: number, mc: number): number {
  let n = 0;
  const d = new Date(rok, mc, 1);
  while (d.getMonth() === mc) {
    if (czyDzienRoboczy(d)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/** Nominalna norma czasu pracy (pełny etat 1/1) w miesiącu = dni robocze × 8 h. */
export function normaMiesieczna(rok: number, mc: number): number {
  return liczbaDniRoboczych(rok, mc) * 8;
}
