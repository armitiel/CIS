import type { Uczestnik } from "./types";

export const GRANICA_BLEDNEGO_STATUSU = Date.parse("2026-07-15T12:30:00Z");

export function wymagaNaprawyStatusu(
  projektId: string,
  u: Uczestnik,
): boolean {
  if (
    !["cis-2026", "psf-sciezka"].includes(projektId) ||
    u.status !== "rezerwowy" ||
    !u.utworzono ||
    !u.dataPrzystapienia ||
    u.dataPrzystapienia === "—"
  )
    return false;
  const utworzono = Date.parse(u.utworzono);
  return Number.isFinite(utworzono) && utworzono <= GRANICA_BLEDNEGO_STATUSU;
}

export function poprawBledneStatusy(
  projektId: string,
  uczestnicy: Uczestnik[],
): { uczestnicy: Uczestnik[]; poprawioneId: string[] } {
  const poprawioneId: string[] = [];
  const poprawieni = uczestnicy.map((u) => {
    if (!wymagaNaprawyStatusu(projektId, u)) return u;
    poprawioneId.push(u.id);
    return { ...u, status: "aktywny" as const };
  });
  return { uczestnicy: poprawieni, poprawioneId };
}
