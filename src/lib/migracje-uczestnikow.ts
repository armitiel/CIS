import type { Uczestnik } from "./types";
import { normalizujDate } from "./import-uczestnikow";

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
    const dataPrzystapienia = normalizujDate(u.dataPrzystapienia);
    const dataZakonczeniaUdzialu = normalizujDate(
      u.sowa?.dataZakonczeniaUdzialu,
    );
    const dataRozpoczeciaWsparcia = normalizujDate(
      u.sowa?.dataRozpoczeciaWsparcia,
    );
    const dataZalozeniaDG = normalizujDate(u.sowa?.dataZalozeniaDG);
    const naprawStatus = wymagaNaprawyStatusu(projektId, u);
    const naprawDate =
      (dataPrzystapienia && dataPrzystapienia !== u.dataPrzystapienia) ||
      (dataZakonczeniaUdzialu &&
        dataZakonczeniaUdzialu !== u.sowa?.dataZakonczeniaUdzialu) ||
      (dataRozpoczeciaWsparcia &&
        dataRozpoczeciaWsparcia !== u.sowa?.dataRozpoczeciaWsparcia) ||
      (dataZalozeniaDG && dataZalozeniaDG !== u.sowa?.dataZalozeniaDG);
    if (!naprawStatus && !naprawDate) return u;
    poprawioneId.push(u.id);
    return {
      ...u,
      status: naprawStatus ? ("aktywny" as const) : u.status,
      dataPrzystapienia: dataPrzystapienia || u.dataPrzystapienia,
      sowa: {
        ...(u.sowa ?? {}),
        dataZakonczeniaUdzialu:
          dataZakonczeniaUdzialu || u.sowa?.dataZakonczeniaUdzialu,
        dataRozpoczeciaWsparcia:
          dataRozpoczeciaWsparcia || u.sowa?.dataRozpoczeciaWsparcia,
        dataZalozeniaDG: dataZalozeniaDG || u.sowa?.dataZalozeniaDG,
      },
    };
  });
  return { uczestnicy: poprawieni, poprawioneId };
}
