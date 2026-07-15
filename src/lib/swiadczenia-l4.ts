export interface WpisL4 {
  data: string;
  znak: string;
}

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
    (w) => w.znak === "l" && w.data < pierwszyIso,
  ).length;
  const l4WMiesiacu = wpisy.filter(
    (w) => w.znak === "l" && w.data >= pierwszyIso && w.data <= ostatniIso,
  ).length;
  const pozostalyLimit = Math.max(0, 21 - l4Przed);
  const l4Do21 = Math.min(l4WMiesiacu, pozostalyLimit);
  const l4Ponad21 = l4WMiesiacu - l4Do21;
  return {
    l4WMiesiacu,
    l4Do21,
    l4Ponad21,
    l4LacznieDoKoncaMiesiaca: l4Przed + l4WMiesiacu,
  };
}
