// Wykrywanie programu i zestawu OBOWIĄZKOWYCH logotypów (wizualizacja UE)
// na podstawie numeru naboru. Punkt wyjścia: historia projektów Stowarzyszenia
// „Pomost" — wszystkie w programie FELB / Fundusze Europejskie dla Lubuskiego
// (FEWL 2021–2027), współfinansowane z EFS+. Zestaw można nadpisać lub
// uzupełnić własnymi plikami ręcznie (moduł Dokumenty → Wizualizacja).

export type RolaLogo = "fe" | "rp" | "ue" | "dodatkowe";

export interface SlotLogo {
  rola: RolaLogo;
  nazwa: string; // co ma trafić do slotu
  obowiazkowy: boolean;
}

export interface ZestawLogotypow {
  id: string;
  program: string; // pełna nazwa programu
  skrot: string; // krótka etykieta (badge)
  opis: string;
  zrodloUrl: string; // oficjalne źródło zestawu znaków
  sloty: SlotLogo[];
  /**
   * Wbudowany domyślny pasek znaków (pliki w public/) — używany automatycznie,
   * gdy projekt nie ma własnych logotypów. Pusta lista = brak domyślnego.
   */
  domyslnePliki: string[];
}

/** Obowiązkowy zestaw znaków dla projektów EFS+ 2021–2027. */
const SLOTY_EFS: SlotLogo[] = [
  {
    rola: "fe",
    nazwa: "Znak Funduszy Europejskich (wariant programu)",
    obowiazkowy: true,
  },
  { rola: "rp", nazwa: "Barwy Rzeczypospolitej Polskiej", obowiazkowy: true },
  {
    rola: "ue",
    nazwa: "Znak Unii Europejskiej (z odniesieniem do EFS+)",
    obowiazkowy: true,
  },
  {
    rola: "dodatkowe",
    nazwa: "Logo dodatkowe (np. beneficjenta / CIS)",
    obowiazkowy: false,
  },
];

export const ZESTAW_FELB: ZestawLogotypow = {
  id: "felb-efs",
  program: "Fundusze Europejskie dla Lubuskiego (FEWL) 2021–2027",
  skrot: "FELB · EFS+",
  opis:
    "Regionalny program województwa lubuskiego, współfinansowany z EFS+. " +
    "Obowiązkowy zestaw: znak FE dla Lubuskiego, barwy RP, znak UE/EFS+.",
  zrodloUrl:
    "https://funduszeue.lubuskie.pl/dokumenty-list/zasady-oznakowania-projektow-fewl/",
  sloty: SLOTY_EFS,
  domyslnePliki: ["/logo/felb/zestaw-felb-efs.png"],
};

export const ZESTAW_FERS: ZestawLogotypow = {
  id: "fers-efs",
  program: "Fundusze Europejskie dla Rozwoju Społecznego (FERS) 2021–2027",
  skrot: "FERS · EFS+",
  opis:
    "Krajowy program EFS+. Obowiązkowy zestaw: znak FE, barwy RP, znak UE/EFS+.",
  zrodloUrl: "https://www.funduszeeuropejskie.gov.pl/",
  sloty: SLOTY_EFS,
  domyslnePliki: ["/logo/fers/zestaw-fers-efs.png"],
};

export const ZESTAW_OGOLNY: ZestawLogotypow = {
  id: "fe-ogolny",
  program: "Fundusze Europejskie — program do ustalenia",
  skrot: "FE · do ustalenia",
  opis:
    "Nie rozpoznano programu z numeru naboru. Sprawdź wytyczne swojego " +
    "programu (Księga Tożsamości Wizualnej) i wskaż zestaw ręcznie.",
  zrodloUrl: "https://www.funduszeeuropejskie.gov.pl/",
  sloty: SLOTY_EFS,
  domyslnePliki: [],
};

export const ZESTAWY: ZestawLogotypow[] = [
  ZESTAW_FELB,
  ZESTAW_FERS,
  ZESTAW_OGOLNY,
];

/**
 * Wykrywa zestaw logotypów po numerze naboru (prefiks programu).
 * FELB → FEWL (Lubuskie), FERS → krajowy EFS+, inaczej → ogólny do ustalenia.
 */
export function wykryjZestaw(nabor: string | undefined): ZestawLogotypow {
  const n = (nabor ?? "").toUpperCase().replace(/\s/g, "");
  if (n.startsWith("FELB")) return ZESTAW_FELB;
  if (n.startsWith("FERS")) return ZESTAW_FERS;
  return ZESTAW_OGOLNY;
}

/** Czy program został rozpoznany (czy nie jest to zestaw ogólny). */
export function rozpoznanyProgram(nabor: string | undefined): boolean {
  return wykryjZestaw(nabor).id !== ZESTAW_OGOLNY.id;
}
