/** Znaki przechowywane dla jednego uczestnika i dnia. `l` oznacza wpis historyczny. */
export type Znak = "p" | "a" | "l" | "l21" | "l22" | "w";

/** Znaki dostępne przy nowym oznaczaniu obecności. */
export const ZNAKI_DO_WYBORU = ["p", "a", "l21", "l22", "w"] as const;

export type KodObecnosci = "O" | "NN" | "L4" | "L4≤21" | "L4>21" | "DW" | "";

export function czyL4(znak: string): boolean {
  return znak === "l" || znak === "l21" || znak === "l22";
}

export function kodObecnosci(znak: Znak | null): KodObecnosci {
  if (znak === "p") return "O";
  if (znak === "a") return "NN";
  if (znak === "l") return "L4";
  if (znak === "l21") return "L4≤21";
  if (znak === "l22") return "L4>21";
  if (znak === "w") return "DW";
  return "";
}

export const NASTEPNY_ZNAK: Record<"" | Znak, Znak | null> = {
  "": "p",
  p: "a",
  a: "l21",
  l: "l21",
  l21: "l22",
  l22: "w",
  w: null,
};
