export interface WpisL4 {
  data: string;
  znak: string;
}

const JEST_L4 = new Set(["l", "l21", "l22"]);

/** Dzieli L4 w oglądanym miesiącu według narastającego limitu 21 dni. */
export function podzielL4(
  wpisy: WpisL4[],
  pierwszyIso: string,
  ostatniIso: string,
): {
  l4WMiesiacu: number;
  l4Do21: number;
  l4Ponad21: number;
  l4LacznieDoKoncaMiesiaca: number;
} {
  const l4Przed = wpisy.filter(
    (w) => JEST_L4.has(w.znak) && w.data < pierwszyIso,
  ).length;
  const wMiesiacu = wpisy.filter(
    (w) => JEST_L4.has(w.znak) && w.data >= pierwszyIso && w.data <= ostatniIso,
  );
  const l4WMiesiacu = wMiesiacu.length;
  const jawneDo21 = wMiesiacu.filter((w) => w.znak === "l21").length;
  const jawnePonad21 = wMiesiacu.filter((w) => w.znak === "l22").length;
  const historyczne = wMiesiacu.filter((w) => w.znak === "l").length;
  // Jawne oznaczenia użytkownika mają pierwszeństwo. Stare wpisy `l` dzielimy
  // automatycznie według pozostałej części narastającego limitu.
  const pozostalyLimit = Math.max(0, 21 - l4Przed - jawneDo21);
  const historyczneDo21 = Math.min(historyczne, pozostalyLimit);
  const l4Do21 = jawneDo21 + historyczneDo21;
  const l4Ponad21 = jawnePonad21 + historyczne - historyczneDo21;
  return {
    l4WMiesiacu,
    l4Do21,
    l4Ponad21,
    l4LacznieDoKoncaMiesiaca: l4Przed + l4WMiesiacu,
  };
}
