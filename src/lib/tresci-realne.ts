// Realne treści formularzy CIS — wierne odwzorowanie wzorów PDF
// z katalogu Formularze_projektowe (A-01, B-01–B-04, C-04, D-01, F-01, F-02).
// Dane uczestnika wstawiane z kartoteki; znane pola słownikowe zaznaczane automatycznie.

import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from "docx";
import type { Uczestnik } from "./types";
import type { SpecyfikacjaProjektu, WymaganyDokument } from "./projekt-spec";

type Blok = Paragraph | Table;

const K = "………………………………………";
const CW = 9026;

const TYTUL_CIS =
  "Projekt „Aktywizacja zawodowa i społeczna osób zagrożonych wykluczeniem społecznym i marginalizacją (…) z terenu gminy Świebodzin”, nr FELB.06.11-IZ.00-0001/26 — CIS Świebodzin";

/** Stopka projektowa (pełna nazwa) — używana też przez generator. */
export function stopkaTekst(spec: SpecyfikacjaProjektu): string {
  if (spec.id === "cis-2026")
    return "Projekt „Aktywizacja zawodowa i społeczna osób zagrożonych wykluczeniem społecznym i marginalizacją, w tym w szczególności osób bezrobotnych i biernych zawodowo z terenu gminy Świebodzin” FELB.06.11-IZ.00-0001/26, realizowany przez Stowarzyszenie na Rzecz Edukacji „Pomost” w ramach Programu Fundusze Europejskie dla Lubuskiego 2021–2027. Okres realizacji od 01.06.2026 r. do 31.12.2027 r.";
  return `Projekt „${spec.nazwa}” ${spec.nabor}, realizowany przez ${spec.wnioskodawca}. Okres realizacji: ${spec.okres}.`;
}

const bord = { style: BorderStyle.SINGLE, size: 2, color: "999999" };
const borders = { top: bord, bottom: bord, left: bord, right: bord };

const tytul = (t: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: t, bold: true, size: 26 })],
  });

const podtytul = (symbol: string, spec: SpecyfikacjaProjektu): Paragraph[] => [
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `Formularz ${symbol}`, size: 18, color: "555555" }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: spec.id === "cis-2026" ? TYTUL_CIS : stopkaTekst(spec),
        size: 16,
        color: "555555",
      }),
    ],
  }),
];

const sekcja = (t: string) =>
  new Paragraph({
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text: t, bold: true, size: 22 })],
  });

const akapit = (t: string, i = false, size = 20) =>
  new Paragraph({
    spacing: { after: 100 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: t, italics: i, size, color: i ? "666666" : undefined }),
    ],
  });

const cb = (t: string, checked = false) =>
  new Paragraph({
    spacing: { after: 60 },
    indent: { left: 240 },
    children: [new TextRun({ text: `${checked ? "☒" : "☐"} ${t}`, size: 20 })],
  });

const wiersz2 = (label: string, val: string, wL: number) =>
  new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: wL, type: WidthType.DXA },
        shading: { fill: "F2F5F2", type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 110, right: 110 },
        children: [
          new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: label, size: 20 })],
          }),
        ],
      }),
      new TableCell({
        borders,
        width: { size: CW - wL, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 110, right: 110 },
        children: [
          new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: val, size: 20 })],
          }),
        ],
      }),
    ],
  });

const tabela2 = (rows: [string, string][], wL = 3600) =>
  new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [wL, CW - wL],
    rows: rows.map(([l, v]) => wiersz2(l, v, wL)),
  });

const tabelaN = (szer: number[], naglowki: string[], wiersze: string[][]) =>
  new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: szer,
    rows: [
      new TableRow({
        children: naglowki.map(
          (h, i) =>
            new TableCell({
              borders,
              width: { size: szer[i], type: WidthType.DXA },
              shading: { fill: "E4EBE4", type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 110, right: 110 },
              children: [
                new Paragraph({
                  spacing: { after: 0 },
                  children: [new TextRun({ text: h, bold: true, size: 19 })],
                }),
              ],
            }),
        ),
      }),
      ...wiersze.map(
        (w) =>
          new TableRow({
            children: w.map(
              (c, i) =>
                new TableCell({
                  borders,
                  width: { size: szer[i], type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 110, right: 110 },
                  children: [
                    new Paragraph({
                      spacing: { after: 0 },
                      children: [new TextRun({ text: c, size: 19 })],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });

const podpisy2 = (l: string, p: string): Paragraph[] => [
  new Paragraph({ spacing: { before: 420 }, children: [] }),
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    children: [
      new TextRun("……………………………………"),
      new TextRun("\t……………………………………"),
    ],
  }),
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    children: [
      new TextRun({ text: l, size: 17, color: "555555" }),
      new TextRun({ text: `\t${p}`, size: 17, color: "555555" }),
    ],
  }),
];

const pusty = () => new Paragraph({ spacing: { after: 60 }, children: [] });

const dzis = () =>
  new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Pełna realna treść formularza — null, gdy brak wzoru (wtedy generator używa wersji ogólnej). */
export function trescRealna(
  d: WymaganyDokument,
  u: Uczestnik,
  spec: SpecyfikacjaProjektu,
): Blok[] | null {
  const s = u.sowa ?? {};
  const v = (x?: string | number) =>
    x !== undefined && x !== null && String(x).trim() !== "" ? String(x) : "";
  const imieNazwisko = `${u.imie} ${u.nazwisko}`.trim();
  const wyk = (s.wyksztalcenie ?? "").toLowerCase();
  const status = (s.statusRynkuPracy ?? "").toLowerCase();

  switch (d.id) {
    case "a-01":
      return [
        tytul("PAKIET ZGŁOSZENIOWY UCZESTNIKA / UCZESTNICZKI PROJEKTU"),
        ...podtytul("CIS/A-01", spec),
        akapit(
          "Niniejszy dokument zawiera: formularz zgłoszeniowy, oświadczenia kwalifikacyjne, deklarację uczestnictwa, klauzulę informacyjną RODO, zgodę na przetwarzanie danych osobowych (w tym danych szczególnej kategorii) oraz zgodę na wykorzystanie wizerunku. Jeden podpis na końcu dokumentu potwierdza wszystkie zawarte oświadczenia i zgody.",
          true,
        ),
        sekcja(
          "SEKCJA A. DANE OSOBOWE I TELEADRESOWE (zakres zgodny z Zał. nr 4 do Umowy o dofinansowanie)",
        ),
        tabela2([
          ["Imię (imiona)", v(u.imie)],
          ["Nazwisko", v(u.nazwisko)],
          ["PESEL", v(s.pesel)],
          ["Data urodzenia", ""],
          ["Wiek w chwili przystąpienia do projektu", v(s.wiek)],
          ["Obywatelstwo", v(s.obywatelstwo)],
          ["Kraj", v(s.kraj)],
          ["Województwo", v(s.wojewodztwo) || "Lubuskie"],
          ["Powiat", v(s.powiat) || "Świebodziński"],
          ["Gmina", v(s.gmina) || "Świebodzin"],
          ["Miejscowość", v(s.miejscowosc)],
          ["Ulica, nr domu / lokalu", ""],
          ["Kod pocztowy", v(s.kodPocztowy)],
          ["Telefon kontaktowy", v(s.telefon)],
          ["Adres e-mail", v(s.email)],
        ]),
        pusty(),
        akapit("Płeć:"),
        cb("Kobieta", s.plec === "kobieta"),
        cb("Mężczyzna", s.plec === "mężczyzna"),
        akapit("Obszar zamieszkania wg stopnia urbanizacji (DEGURBA):"),
        cb("Miasto (DEGURBA 1–2)", s.degurba === "1" || s.degurba === "2"),
        cb("Obszar wiejski (DEGURBA 3)", s.degurba === "3"),
        sekcja("SEKCJA B. STATUS SPOŁECZNO-ZAWODOWY"),
        akapit("Status na rynku pracy w chwili przystąpienia do projektu:"),
        cb(
          "Osoba bezrobotna zarejestrowana w PUP",
          status.includes("bezrobotna zarejestrowana"),
        ),
        cb(
          "w tym osoba długotrwale bezrobotna (powyżej 12 miesięcy)",
          status.includes("długotrwale"),
        ),
        cb(
          "Osoba bezrobotna niezarejestrowana w PUP",
          status.includes("niezarejestrowana"),
        ),
        cb("Osoba bierna zawodowo", status.includes("biern")),
        cb("Osoba pracująca", status.includes("pracując")),
        akapit("Rodzaj uczestnika w projekcie:"),
        cb(
          "Uczestnik CIS (skierowanie do CIS + Indywidualny Program Zatrudnienia Socjalnego, świadczenie integracyjne)",
          u.kategoria === "bezrobotny",
        ),
        cb(
          "Osoba bezrobotna spoza CIS (Indywidualna Ścieżka Reintegracji + Indywidualny Program Rozwoju)",
          false,
        ),
        cb(
          "Osoba bierna zawodowo (Indywidualna Ścieżka Reintegracji + Indywidualny Program Rozwoju)",
          u.kategoria === "bierny",
        ),
        akapit("Poziom wykształcenia (najwyższy ukończony):"),
        cb(
          "Niższe niż podstawowe / podstawowe (ISCED 0–1)",
          wyk.includes("isced 0") || wyk.includes("isced 1"),
        ),
        cb("Gimnazjalne / zasadnicze (ISCED 2)", wyk.includes("isced 2")),
        cb("Ponadgimnazjalne / średnie (ISCED 3)", wyk.includes("isced 3")),
        cb("Policealne (ISCED 4)", wyk.includes("isced 4")),
        cb("Wyższe (ISCED 5–8)", wyk.includes("isced 5")),
        sekcja(
          "SEKCJA C. STATUS UCZESTNIKA (dane szczególnej kategorii — podanie dobrowolne)",
        ),
        akapit("Niepełnosprawność:"),
        cb("NIE posiadam orzeczenia o niepełnosprawności"),
        cb("TAK — posiadam orzeczenie. Stopień: ☐ lekki ☐ umiarkowany ☐ znaczny"),
        akapit(
          `Rodzaj niepełnosprawności (w tym priorytetowy: sprzężona / choroby psychiczne / intelektualna / całościowe zaburzenia rozwojowe): ${K}`,
        ),
        akapit(
          "Pozostałe cechy (proszę zaznaczyć, jeśli dotyczy; można odmówić podania):",
        ),
        cb("Przynależność do mniejszości narodowej lub etnicznej / społeczności marginalizowanej"),
        cb("Osoba obcego pochodzenia / migrant"),
        cb("Osoba z krajów trzecich"),
        cb("Osoba w kryzysie bezdomności lub dotknięta wykluczeniem mieszkaniowym"),
        cb("Osoba dotknięta problemem uzależnienia"),
        cb("Osoba dotknięta ubóstwem"),
        cb("Odmawiam podania danych szczególnej kategorii"),
        sekcja("SEKCJA D. POTRZEBY W ZAKRESIE DOSTĘPNOŚCI (jeśli dotyczy)"),
        cb("Materiały w dużej czcionce"),
        cb("Materiały w tekście łatwym do czytania (ETR)"),
        cb("Wsparcie asystenta osoby z niepełnosprawnością"),
        cb("Dostępność architektoniczna / podjazdy"),
        cb("Potrzeby dietetyczne"),
        cb("Opieka nad osobą zależną w czasie zajęć"),
        cb("Wsparcie telefoniczne / zdalne"),
        akapit(`Inne potrzeby: ${K}`),
        sekcja(
          "SEKCJA E. OŚWIADCZENIA KWALIFIKACYJNE (kryteria formalne — wymagane łącznie)",
        ),
        akapit("Oświadczam, że spełniam wszystkie poniższe kryteria (proszę zaznaczyć każde):"),
        cb("Jestem osobą pełnoletnią (ukończone 18 lat).", true),
        cb(
          "Zamieszkuję na terenie Gminy Świebodzin (MOF Świebodzin), woj. lubuskie, w rozumieniu art. 25 Kodeksu cywilnego.",
          true,
        ),
        cb(
          "Jestem osobą zagrożoną ubóstwem lub wykluczeniem społecznym co najmniej z jednego powodu (bezrobocie, bierność zawodowa, niepełnosprawność, uzależnienie, ubóstwo).",
          true,
        ),
        cb("Zgłaszam udział w projekcie z własnej, nieprzymuszonej woli.", true),
        sekcja(
          "SEKCJA F. PRZESŁANKI PREMIUJĄCE (do oceny punktowej przez Komisję — proszę zaznaczyć, jeśli dotyczy)",
        ),
        cb("Płeć żeńska (10 pkt)", s.plec === "kobieta"),
        cb("Wielokrotne wykluczenie: ☐ 2 formy (5 pkt) ☐ 3 i więcej form (10 pkt)"),
        cb("Niepełnosprawność: ☐ umiarkowana (5 pkt) ☐ znaczna (10 pkt) ☐ rodzaj priorytetowy (+5 pkt)"),
        cb(
          "Zamieszkanie na obszarze wiejskim / wykluczenie komunikacyjne — DEGURBA 3 (10 pkt)",
          s.degurba === "3",
        ),
        cb("Opuszczenie placówki opieki instytucjonalnej (5 pkt) / jednostki penitencjarnej w ostatnich 12 m-cach (5 pkt)"),
        cb("Korzystanie z Programu FE na rzecz Pomocy Żywnościowej — FE PŻ (5 pkt)"),
        sekcja("SEKCJA G. DEKLARACJA UCZESTNICTWA"),
        akapit("Zobowiązuję się do:"),
        cb("Udziału w indywidualnej diagnozie i opracowaniu Indywidualnej Ścieżki Reintegracji (IŚR).", true),
        cb("Regularnego udziału w zajęciach reintegracji społecznej i zawodowej (zgodnie z IPZS / IPR).", true),
        cb("Obecności na co najmniej 80% zajęć.", true),
        cb("Udziału w walidacji efektów oraz wypełniania ankiet ewaluacyjnych (PRE i POST) i badania trwałości.", true),
        cb("Niezwłocznego informowania o zmianie danych osobowych oraz o zamiarze rezygnacji.", true),
        akapit("Potwierdzam zapoznanie się z:"),
        cb("Regulaminem rekrutacji i uczestnictwa w projekcie (CIS/A-02).", true),
        sekcja("SEKCJA H. WYMAGANE ZAŁĄCZNIKI"),
        akapit("Do formularza należy dołączyć (jeśli dotyczy):"),
        cb("Dowód osobisty / zaświadczenie o zamieszkaniu lub oświadczenie (kryterium terytorialne)."),
        cb("Zaświadczenie z PUP o statusie osoby bezrobotnej / oświadczenie o bierności zawodowej."),
        cb("Orzeczenie o niepełnosprawności."),
        cb("Zaświadczenie z OPS / dokumenty potwierdzające przesłanki wykluczenia."),
        cb("Skierowanie do CIS (dotyczy uczestników CIS)."),
        cb("Oświadczenie uczestnika potwierdzające przesłankę zagrożenia wykluczeniem (gdy brak innego dokumentu źródłowego)."),
        sekcja("SEKCJA I. KLAUZULA INFORMACYJNA RODO"),
        akapit(
          "Zgodnie z art. 13 ust. 1 i 2 Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) informujemy:",
        ),
        akapit(
          "1. Administrator danych: Stowarzyszenie na Rzecz Edukacji „Pomost”, ul. Okrężna 3, 66-200 Świebodzin, e-mail: stowarzyszenie@naszpomost.pl. KRS 0000252395, NIP 9271873207, REGON 080086485.",
        ),
        akapit(
          "2. Cel przetwarzania: rekrutacja, realizacja, monitoring, ewaluacja, kontrola i rozliczanie projektu nr FELB.06.11-IZ.00-0001/26 współfinansowanego ze środków UE (EFS+) w ramach programu Fundusze Europejskie dla Lubuskiego 2021–2027.",
        ),
        akapit(
          "3. Podstawa prawna: art. 6 ust. 1 lit. a), b), c) oraz art. 9 ust. 2 lit. a), g) RODO (zgoda, wykonanie umowy, obowiązek prawny, ważny interes publiczny — fundusze UE).",
        ),
        akapit(
          "4. Odbiorcy danych: Instytucja Zarządzająca FEWL 21–27 (Urząd Marszałkowski Województwa Lubuskiego), instytucje kontrolne i audytowe UE i krajowe, podmioty przetwarzające dane w systemie CST2021.",
        ),
        akapit(
          "5. Okres przechowywania: do czasu wynikającego z przepisów o funduszach UE (okres trwałości i archiwizacji projektu).",
        ),
        akapit(
          "6. Prawa: dostęp do danych, sprostowanie, ograniczenie, usunięcie (w zakresie dopuszczalnym przepisami), wniesienie skargi do Prezesa UODO.",
        ),
        akapit(
          "7. Podanie danych jest dobrowolne, ale niezbędne do udziału w projekcie; odmowa uniemożliwia rekrutację i udział.",
        ),
        sekcja("SEKCJA J. ZGODY"),
        cb(
          "Wyrażam zgodę na przetwarzanie moich danych osobowych, w tym danych szczególnej kategorii (m.in. o stanie zdrowia/niepełnosprawności), w celach wskazanych w klauzuli RODO.",
          true,
        ),
        cb("Wyrażam zgodę na nieodpłatne wykorzystanie mojego wizerunku w materiałach informacyjno-promocyjnych projektu (zgoda dobrowolna, nieobowiązkowa)."),
        akapit("Oświadczam, że podane przeze mnie dane i informacje są zgodne z prawdą."),
        ...podpisy2(
          `miejscowość, data (Świebodzin, ${dzis()})`,
          "czytelny podpis Uczestnika / Uczestniczki",
        ),
        pusty(),
        akapit(
          "Potwierdzenie przyjęcia zgłoszenia (wypełnia pracownik socjalny / komisja rekrutacyjna):",
        ),
        akapit(`Data wpływu: …………………    Podpis przyjmującego: ${K}`),
      ];

    case "b-01":
      return [
        tytul("UMOWA UCZESTNICTWA W PROJEKCIE"),
        ...podtytul("CIS/B-01", spec),
        akapit(`zawarta w dniu ${dzis()} r. w Świebodzinie, pomiędzy:`),
        akapit(
          "Stowarzyszeniem na Rzecz Edukacji „Pomost” z siedzibą w Świebodzinie (66-200), ul. Okrężna 3, KRS 0000252395, NIP 9271873207, REGON 080086485, reprezentowanym przez Dorotę Królikowską — Prezesa Zarządu, zwanym dalej „Realizatorem projektu”,",
        ),
        akapit("a"),
        akapit(`Panią/Panem: ${imieNazwisko || K}`),
        akapit(`PESEL: ${v(s.pesel) || K}`),
        akapit(
          `zamieszkałą/ym: ${
            s.miejscowosc
              ? `${s.miejscowosc}, gm. ${s.gmina ?? ""}, ${s.kodPocztowy ?? ""}`
              : K
          }`,
        ),
        akapit(
          "zwaną/ym dalej „Uczestnikiem / Uczestniczką projektu”; łącznie „Stronami”.",
        ),
        sekcja("§ 1. Przedmiot umowy"),
        akapit(
          "1. Przedmiotem umowy jest określenie wzajemnych praw i obowiązków Stron związanych z udziałem w projekcie realizowanym w CIS Świebodzin na podstawie ustawy z dnia 13 czerwca 2003 r. o zatrudnieniu socjalnym. 2. Projekt współfinansowany ze środków UE (EFS+), program FEWL 21–27, Działanie 6.11. Okres realizacji: 01.06.2026 – 31.12.2027.",
        ),
        sekcja("§ 2. Zakres wsparcia"),
        akapit(
          "Uczestnik/Uczestniczka zostaje objęty/a wsparciem obejmującym: 1. indywidualną diagnozę i opracowanie Indywidualnej Ścieżki Reintegracji (IŚR); 2. realizację Indywidualnego Programu Zatrudnienia Socjalnego (IPZS — uczestnicy CIS) lub Indywidualnego Programu Rozwoju (IPR — osoby bierne zawodowo lub bezrobotne spoza CIS); 3. reintegrację społeczną: warsztaty kompetencji społecznych, wsparcie psychologa i terapeuty uzależnień; 4. reintegrację zawodową: doradztwo zawodowe, zajęcia w pracowniach, kursy i szkolenia zawodowe oraz pośrednictwo pracy; 5. świadczenia towarzyszące: świadczenie integracyjne (dla uczestników CIS), wyżywienie, dowóz na zajęcia, opieka nad osobą zależną.",
        ),
        sekcja("§ 3. Obowiązki Uczestnika / Uczestniczki"),
        akapit(
          "1. Realizacja zobowiązań wynikających z IŚR oraz IPZS/IPR. 2. Regularny i aktywny udział, obecność na co najmniej 80% zajęć, potwierdzana podpisem. 3. Udział w diagnozie i walidacji efektów. 4. Wypełnianie ankiet (PRE/POST) i badania trwałości. 5. Informowanie Realizatora o zmianie danych osobowych. 6. Informowanie o zamiarze rezygnacji wraz z przyczyną. 7. Przestrzeganie regulaminu CIS oraz zasad BHP.",
        ),
        sekcja("§ 4. Obowiązki Realizatora projektu"),
        akapit(
          "1. Zapewnienie wykwalifikowanej kadry merytorycznej. 2. Przeprowadzenie diagnozy i opracowanie IŚR oraz IPZS/IPR. 3. Organizacja form wsparcia zgodnie z § 2. 4. Zapewnienie materiałów i pomocy. 5. Organizacja walidacji efektów. 6. Zapewnienie świadczeń towarzyszących zgodnie ze zgłoszonymi potrzebami. 7. Przetwarzanie danych zgodnie z RODO. 8. Zapewnienie dostępności dla osób z niepełnosprawnościami.",
        ),
        sekcja("§ 5. Świadczenia towarzyszące"),
        akapit(
          "1. Uczestnikom CIS przysługuje świadczenie integracyjne na zasadach ustawy o zatrudnieniu socjalnym. 2. Realizator zapewnia wyżywienie oraz dowóz na zajęcia. 3. Na zgłoszony wniosek zapewniana jest opieka nad osobą zależną w czasie zajęć.",
        ),
        sekcja("§ 6. Czas trwania i warunki uczestnictwa"),
        akapit(
          "1. Umowa obowiązuje od dnia podpisania do zakończenia udziału uczestnika w projekcie. 2. Warunkiem ukończenia jest realizacja IŚR/IPZS/IPR oraz przystąpienie do walidacji.",
        ),
        sekcja("§ 7. Rozwiązanie umowy"),
        akapit(
          "1. Uczestnik może rozwiązać umowę w każdym czasie przez pisemne oświadczenie. 2. Realizator może rozwiązać umowę (skreślić z listy) w przypadku nieusprawiedliwionej nieobecności powyżej 20%, rażącego naruszenia regulaminu lub podania nieprawdziwych danych.",
        ),
        sekcja("§ 8. Ochrona danych osobowych"),
        akapit(
          "Administratorem danych jest Realizator. Dane przetwarzane są w celu rekrutacji, realizacji, monitoringu, ewaluacji, kontroli i rozliczania projektu, zgodnie z RODO oraz przepisami dotyczącymi funduszy UE. Szczegółowa klauzula informacyjna stanowi część Pakietu zgłoszeniowego (CIS/A-01).",
        ),
        sekcja("§ 9. Postanowienia końcowe"),
        akapit(
          "1. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze Stron. 2. W sprawach nieuregulowanych stosuje się przepisy ustawy o zatrudnieniu socjalnym, Kodeksu cywilnego oraz przepisy dotyczące funduszy UE.",
        ),
        ...podpisy2("Realizator projektu", "Uczestnik / Uczestniczka projektu"),
      ];

    case "b-02": {
      const obszar = (rows: [string, string][]) =>
        tabelaN(
          [2100, 4926, 1000, 1000],
          ["Obszar", "Kryterium", "Poziom (1–5)", "Uwagi"],
          rows.map(([o, k]) => [o, k, "", ""]),
        );
      return [
        tytul("ARKUSZ DIAGNOZY KOMPLEKSOWEJ UCZESTNIKA / UCZESTNICZKI"),
        ...podtytul("CIS/B-02", spec),
        akapit(
          "DOTYCZY: wszystkich uczestników projektu (101 osób) — podstawa do opracowania IŚR w formie IPZS lub IPR. Diagnoza kompleksowa w ramach Zadania 1. Realizowana przez zespół: koordynator procesu włączenia, psycholog, doradca zawodowy, pracownik socjalny.",
          true,
        ),
        sekcja("CZĘŚĆ I. DANE UCZESTNIKA / UCZESTNICZKI"),
        tabela2([
          ["Imię i nazwisko", imieNazwisko],
          ["PESEL", v(s.pesel)],
          ["Numer w rejestrze", ""],
          [
            "Rodzaj uczestnika / ścieżka",
            u.sciezka === "IPZS"
              ? "☒ uczestnik CIS (IPZS)  ☐ os. bezrobotna spoza CIS (IPR)  ☐ os. bierna zawodowo (IPR)"
              : "☐ uczestnik CIS (IPZS)  ☐ os. bezrobotna spoza CIS (IPR)  ☒ os. bierna zawodowo (IPR)",
          ],
          ["Data diagnozy", ""],
          ["Miejsce diagnozy", ""],
        ]),
        sekcja(
          "CZĘŚĆ II. OBSZARY DIAGNOZY (skala: 1 = brak/krytyczny, 2 = niski, 3 = przeciętny, 4 = dobry, 5 = bardzo dobry)",
        ),
        akapit("A. Sytuacja społeczna i rodzinna", false, 21),
        obszar([
          ["Relacje", "Relacje rodzinne i sieć wsparcia społecznego"],
          ["Mieszkanie", "Sytuacja mieszkaniowa i bytowa"],
          ["Finanse", "Gospodarowanie budżetem domowym, zadłużenie"],
          ["Instytucje", "Korzystanie z pomocy społecznej / współpraca z OPS"],
        ]),
        pusty(),
        akapit("B. Sytuacja zawodowa", false, 21),
        obszar([
          ["Doświadczenie", "Dotychczasowe doświadczenie zawodowe"],
          ["Kwalifikacje", "Kwalifikacje i umiejętności zawodowe"],
          ["Gotowość", "Gotowość i motywacja do podjęcia zatrudnienia"],
          ["Predyspozycje", "Predyspozycje do określonych zawodów (pracownie CIS)"],
          ["Cyfrowe", "Podstawowe kompetencje cyfrowe"],
        ]),
        pusty(),
        akapit("C. Sytuacja zdrowotna", false, 21),
        obszar([
          ["Zdrowie", "Ogólny stan zdrowia, ograniczenia"],
          ["Niepełnosprawność", "Wpływ niepełnosprawności na funkcjonowanie"],
          ["Uzależnienia", "Ryzyko / obecność problemu uzależnień"],
        ]),
        pusty(),
        akapit("D. Sfera psychologiczna i motywacyjna", false, 21),
        obszar([
          ["Motywacja", "Motywacja do zmiany sytuacji życiowej"],
          ["Samoocena", "Samoocena i poczucie sprawczości"],
          ["Stres", "Radzenie sobie ze stresem i sytuacjami kryzysowymi"],
        ]),
        pusty(),
        akapit("E. Kompetencje społeczne", false, 21),
        obszar([
          ["Komunikacja", "Komunikacja interpersonalna, asertywność"],
          ["Współpraca", "Współpraca w grupie"],
          ["Autoprezentacja", "Autoprezentacja, poruszanie się na rynku pracy"],
        ]),
        sekcja("CZĘŚĆ III. PODSUMOWANIE I WNIOSKI"),
        akapit(`Główne zidentyfikowane bariery i deficyty: ${K} ${K}`),
        akapit(`Mocne strony i zasoby uczestnika: ${K} ${K}`),
        akapit(`Rekomendowane formy wsparcia (reintegracja społeczna / zawodowa, kursy): ${K} ${K}`),
        akapit("Rekomendowana forma Indywidualnej Ścieżki Reintegracji (IŚR):"),
        cb(
          "w formie Indywidualnego Programu Zatrudnienia Socjalnego (IPZS) — uczestnik CIS",
          u.sciezka === "IPZS",
        ),
        cb(
          "w formie Indywidualnego Programu Rozwoju (IPR) — osoba bierna zawodowo lub bezrobotna spoza CIS",
          u.sciezka === "IPR",
        ),
        sekcja("CZĘŚĆ IV. ZESPÓŁ DIAGNOZUJĄCY"),
        tabelaN(
          [3200, 3500, 2326],
          ["Rola", "Imię i nazwisko", "Podpis"],
          [
            ["Koordynator procesu włączenia", "", ""],
            ["Psycholog", "", ""],
            ["Doradca zawodowy", "", ""],
            ["Pracownik socjalny", "", ""],
          ],
        ),
        ...podpisy2(
          "data i podpis uczestnika/uczestniczki",
          "data sporządzenia diagnozy",
        ),
      ];
    }

    case "b-03":
      return [
        tytul("INDYWIDUALNY PROGRAM ZATRUDNIENIA SOCJALNEGO (IPZS)"),
        ...podtytul("CIS/B-03", spec),
        akapit(
          "DOTYCZY: wyłącznie uczestników CIS — osób bezrobotnych skierowanych do CIS. Program ustalany między Centrum Integracji Społecznej a uczestnikiem na podstawie art. 12–15 ustawy z dnia 13 czerwca 2003 r. o zatrudnieniu socjalnym.",
          true,
        ),
        sekcja("I. STRONY I OKRES UCZESTNICTWA"),
        akapit(
          "Centrum Integracji Społecznej w Świebodzinie, prowadzone przez Stowarzyszenie na Rzecz Edukacji „Pomost” (ul. Okrężna 3, 66-200 Świebodzin), reprezentowane przez Kierownika CIS, oraz:",
        ),
        tabela2([
          ["Imię i nazwisko uczestnika", imieNazwisko],
          ["PESEL", v(s.pesel)],
          [
            "Adres zamieszkania",
            s.miejscowosc
              ? `${s.miejscowosc}, gm. ${s.gmina ?? ""}, ${s.kodPocztowy ?? ""}`
              : "",
          ],
          ["Podstawa skierowania do CIS", "☐ OPS  ☐ PUP  ☐ inna: ……………"],
          [
            "Data rozpoczęcia uczestnictwa",
            u.dataPrzystapienia === "—" ? "" : u.dataPrzystapienia,
          ],
          ["Okres realizacji programu", "do 12 miesięcy (z możliwością przedłużenia do 6 m-cy)"],
          ["Okres próbny", "1 miesiąc"],
        ]),
        sekcja("II. ZAKRES REINTEGRACJI SPOŁECZNEJ"),
        cb("Udział w warsztatach kompetencji społecznych i grupach integracyjno-motywacyjnych"),
        cb("Wsparcie psychologa / terapeuty uzależnień"),
        cb("Nauka gospodarowania budżetem domowym i pełnienia ról społecznych"),
        akapit(`Dodatkowy zakres: ${K}`),
        sekcja("III. ZAKRES REINTEGRACJI ZAWODOWEJ"),
        akapit("Przyporządkowanie do pracowni / rodzaj zajęć praktycznych:"),
        cb("Pracownia porządkowo-usługowa"),
        cb("Pracownia ogrodnicza / utrzymania zieleni"),
        cb("Pracownia opiekuna osoby zależnej"),
        cb("Pracownia pomocy kuchennej"),
        cb("Doradztwo zawodowe, kurs/szkolenie zawodowe, pośrednictwo pracy"),
        sekcja("IV. ŚWIADCZENIE INTEGRACYJNE"),
        akapit(
          "Uczestnikowi przysługuje świadczenie integracyjne w wysokości i na zasadach określonych w art. 15 ustawy o zatrudnieniu socjalnym (w okresie próbnym — 50% zasiłku dla bezrobotnych, po okresie próbnym — 100% zasiłku dla bezrobotnych). Wypłata po przepracowaniu wymaganego wymiaru zajęć i potwierdzeniu obecności.",
        ),
        sekcja("V. WZAJEMNE ZOBOWIĄZANIA"),
        akapit(
          "Uczestnik zobowiązuje się do: codziennego udziału w zajęciach (min. wymagana obecność), realizacji IŚR, przestrzegania regulaminu CIS i zasad BHP, dbałości o powierzony sprzęt. CIS zobowiązuje się do: zapewnienia zajęć reintegracji społecznej i zawodowej, opieki specjalistów, świadczenia integracyjnego, świadczeń towarzyszących oraz oceny postępów.",
        ),
        sekcja("VI. MONITOROWANIE I OCENA POSTĘPÓW"),
        akapit(
          "Postępy podlegają bieżącej ocenie. Po okresie próbnym Kierownik CIS, na wniosek pracownika socjalnego, potwierdza kontynuację uczestnictwa. Program może zostać zmieniony, przedłużony lub zakończony zgodnie z ustawą.",
        ),
        ...podpisy2("podpis uczestnika/uczestniczki", "podpis Kierownika CIS"),
      ];

    case "b-04":
      return [
        tytul("INDYWIDUALNY PROGRAM ROZWOJU (IPR)"),
        ...podtytul("CIS/B-04", spec),
        akapit(
          "DOTYCZY: osób biernych zawodowo oraz osób bezrobotnych spoza CIS (nieobjętych IPZS). Dokument operacyjny ścieżki reintegracji opracowany na podstawie diagnozy kompleksowej (CIS/B-02). Realizowany w ramach aktywnej integracji (Działanie 6.11).",
          true,
        ),
        sekcja("I. DANE UCZESTNIKA / UCZESTNICZKI"),
        tabela2([
          ["Imię i nazwisko", imieNazwisko],
          ["PESEL", v(s.pesel)],
          ["Numer w rejestrze", ""],
          [
            "Status",
            status.includes("biern")
              ? "☒ osoba bierna zawodowo  ☐ osoba bezrobotna spoza CIS"
              : "☐ osoba bierna zawodowo  ☒ osoba bezrobotna spoza CIS",
          ],
          ["Okres realizacji programu", ""],
        ]),
        sekcja("II. CELE REINTEGRACJI SPOŁECZNO-ZAWODOWEJ"),
        akapit(`Cel główny: ${K}`),
        akapit(`Cele szczegółowe: ${K} ${K}`),
        sekcja("III. PLANOWANE DZIAŁANIA I FORMY WSPARCIA"),
        tabelaN(
          [3300, 2400, 1600, 1726],
          ["Działanie / forma wsparcia", "Zakres", "Wymiar", "Termin"],
          [
            ["Aktywizacja społeczna (warsztaty, wsparcie specjalistów)", "", "", ""],
            ["Doradztwo zawodowe i Indywidualny Plan Działania", "", "", ""],
            ["Kurs / szkolenie zawodowe", "", "", ""],
            ["Pośrednictwo pracy / staż", "", "", ""],
            ["Świadczenia towarzyszące", "", "", ""],
          ],
        ),
        sekcja("IV. OCZEKIWANE REZULTATY"),
        cb("Poprawa sytuacji społecznej po zakończeniu udziału"),
        cb("Uzyskanie kwalifikacji / kompetencji"),
        cb("Podjęcie zatrudnienia lub aktywne poszukiwanie pracy"),
        sekcja("V. MONITOROWANIE I AKTUALIZACJA"),
        akapit(
          "Realizację programu monitoruje koordynator procesu włączenia we współpracy z doradcą zawodowym i pracownikiem socjalnym. Program podlega aktualizacji w razie zmiany sytuacji uczestnika.",
        ),
        ...podpisy2(
          "podpis uczestnika/uczestniczki",
          "podpis koordynatora procesu włączenia",
        ),
      ];

    case "c-04":
      return [
        tytul("KARTA WSPARCIA INDYWIDUALNEGO"),
        ...podtytul("CIS/C-04", spec),
        akapit(
          "Jeden wzór dla wszystkich form wsparcia indywidualnego. Podpis uczestnika przy każdym spotkaniu stanowi dowód wykonania usługi (dotyczy usług rozliczanych godzinowo: diagnoza poz. 1.1, psycholog poz. 2.2, terapeuta uzależnień poz. 2.3).",
          true,
        ),
        tabela2([
          ["Imię i nazwisko uczestnika", imieNazwisko],
          ["Numer uczestnika w projekcie", ""],
          ["Cykl (I / II)", String(u.cykl)],
        ]),
        pusty(),
        akapit(
          "Rodzaj wsparcia: ☐ psycholog  ☐ terapeuta uzależnień  ☐ doradca zawodowy  ☐ pośrednik pracy  ☐ diagnoza IŚR",
        ),
        sekcja("CZĘŚĆ I. EWIDENCJA SPOTKAŃ"),
        tabelaN(
          [500, 1500, 1600, 3100, 1163, 1163],
          ["Lp.", "Data", "Godziny od–do", "Zakres / temat spotkania", "Podpis uczestnika", "Podpis specjalisty"],
          Array.from({ length: 10 }, (_, i) => [`${i + 1}.`, "", "", "", "", ""]),
        ),
        sekcja("CZĘŚĆ II. SEKCJA DORADCY ZAWODOWEGO (Indywidualny Plan Działania)"),
        akapit(`Predyspozycje i potencjał zawodowy: ${K} ${K}`),
        akapit(`Cel zawodowy i kierunki rozwoju: ${K} ${K}`),
        akapit(
          `Zaplanowane działania (kurs zawodowy z katalogu wniosku, dokumenty aplikacyjne, pośrednictwo pracy): ${K} ${K} ${K}`,
        ),
        ...podpisy2(
          "data i podpis doradcy zawodowego",
          "data i podpis uczestnika (akceptacja IPD)",
        ),
      ];

    case "d-01":
      return [
        tytul("KARTA KURSU ZAWODOWEGO UCZESTNIKA"),
        ...podtytul("CIS/D-01", spec),
        akapit(
          "Jeden dokument na uczestnika i kurs: skierowanie, odbiór materiałów, ocena w 4 etapach i certyfikat. Kursy dobierane indywidualnie na podstawie IŚR (Zadanie 1) i doradztwa zawodowego, zgodnie z katalogiem z wniosku.",
          true,
        ),
        tabela2([
          ["Imię i nazwisko uczestnika", imieNazwisko],
          ["Numer uczestnika w projekcie", ""],
          ["Cykl (I / II)", String(u.cykl)],
        ]),
        sekcja("SEKCJA 1. SKIEROWANIE NA KURS"),
        akapit(
          `Nazwa kursu (z katalogu wniosku, m.in.: cukiernik, piekarz, malarz-tapeciarz, technolog robót wykończeniowych, konserwator terenów zielonych, kosmetyczka, sprzedawca z obsługą kasy fiskalnej i terminala, pracownik biurowy, opiekun osoby starszej, profesjonalne sprzątanie, prawo jazdy kat. B, obsługa kasy fiskalnej): ${K}`,
        ),
        akapit(
          "Podstawa skierowania: zapis w IŚR z dnia ……………… oraz rekomendacja doradcy zawodowego z dnia ………………",
        ),
        akapit(`Organizator kursu / instytucja szkoleniowa: ${K}   Termin: ………………`),
        ...podpisy2(
          "data i podpis uczestnika (przyjęcie skierowania)",
          "data i podpis koordynatora",
        ),
        sekcja("SEKCJA 2. POTWIERDZENIE ODBIORU"),
        akapit("☐ materiały szkoleniowe  ☐ odzież robocza  ☐ środki ochrony osobistej"),
        akapit(`Specyfikacja wydanych elementów: ${K} ${K}`),
        ...podpisy2("data i podpis uczestnika (odbiór)", "data i podpis wydającego"),
        sekcja("SEKCJA 3. OCENA KOMPETENCJI W 4 ETAPACH"),
        tabelaN(
          [3100, 1600, 2400, 1926],
          ["Etap", "Data", "Wynik / ocena", "Podpis egzaminatora / wykładowcy"],
          [
            ["1. Test wstępny", "", "", ""],
            ["2. Ocena śródokresowa", "", "", ""],
            ["3. Egzamin końcowy", "", "", ""],
            ["4. Ewaluacja po 3 miesiącach", "", "", ""],
          ],
        ),
        sekcja("SEKCJA 4. CERTYFIKAT / ZAŚWIADCZENIE (wskaźnik EECR03)"),
        akapit(`Numer certyfikatu: ………………………………………   Data wydania: ………………`),
        akapit(`Uzyskane kwalifikacje / kompetencje: ${K} ${K}`),
        akapit(
          "Kopię certyfikatu włączono do dokumentacji projektu i odnotowano w skoroszycie monitoringu wskaźników (CIS/F-03): ☐ TAK",
        ),
      ];

    case "f-01":
      return [
        tytul("ANKIETA KOMPETENCJI PRE / POST"),
        ...podtytul("CIS/F-01", spec),
        akapit(
          "Ankieta nie wymaga podpisu uczestnika. Identyfikacja po numerze uczestnika w projekcie. Pomiar PRE przy diagnozie (Zadanie 1), pomiar POST przy zakończeniu udziału. Fakt wypełnienia na zajęciach potwierdza dzienna lista obecności (CIS/C-01).",
          true,
        ),
        tabela2([
          ["Numer uczestnika w projekcie", u.id === "wzor" ? "" : u.id.toUpperCase()],
          ["Data pomiaru PRE", ""],
          ["Data pomiaru POST", ""],
        ]),
        pusty(),
        akapit(
          "Instrukcja: proszę ocenić każdą umiejętność w skali 1–5 (1 bardzo nisko, 5 bardzo wysoko).",
        ),
        tabelaN(
          [5226, 1900, 1900],
          ["Obszar kompetencji", "Ocena PRE (1–5)", "Ocena POST (1–5)"],
          [
            ["Komunikacja z innymi ludźmi", "", ""],
            ["Asertywność (umiejętność mówienia NIE)", "", ""],
            ["Radzenie sobie ze stresem", "", ""],
            ["Współpraca w grupie", "", ""],
            ["Autoprezentacja (np. rozmowa o pracę)", "", ""],
            ["Poczucie własnej wartości", "", ""],
            ["Motywacja do zmiany swojej sytuacji", "", ""],
            ["Gospodarowanie budżetem domowym", "", ""],
            ["Korzystanie z komputera i internetu", "", ""],
            ["Znajomość praw konsumenta i praw pracowniczych", "", ""],
            ["Gotowość do podjęcia pracy", "", ""],
          ],
        ),
        pusty(),
        akapit(
          "Suma punktów PRE: ………………   Suma punktów POST: ………………   Zmiana: ………………",
        ),
        ...podpisy2(
          "pomiar PRE: data i podpis osoby przeprowadzającej",
          "pomiar POST: data i podpis osoby przeprowadzającej",
        ),
      ];

    case "f-02":
      return [
        tytul("ANKIETA KOŃCOWA Z OŚWIADCZENIEM O SYTUACJI PO ZAKOŃCZENIU UDZIAŁU"),
        ...podtytul("CIS/F-02", spec),
        akapit(
          "Wypełniana do 4 tygodni od zakończenia udziału w projekcie. Oświadczenie w części II stanowi źródło pomiaru wskaźników rezultatu EECR01 (poszukiwanie pracy) i EECR04 (podjęcie pracy lub działalności), dlatego wymaga podpisu uczestnika.",
          true,
        ),
        tabela2([
          ["Imię i nazwisko uczestnika", imieNazwisko],
          ["Numer uczestnika w projekcie", u.id === "wzor" ? "" : u.id.toUpperCase()],
          ["Data zakończenia udziału", ""],
          ["Data wypełnienia", dzis()],
        ]),
        sekcja("CZĘŚĆ I. OCENA WSPARCIA (skala 1–5)"),
        tabelaN(
          [7126, 1900],
          ["Forma wsparcia", "Ocena (1–5)"],
          [
            ["Diagnoza i Indywidualna Ścieżka Reintegracji", ""],
            ["Wsparcie psychologa / terapeuty", ""],
            ["Warsztaty kompetencji społecznych i edukacyjne", ""],
            ["Doradztwo zawodowe i pośrednictwo pracy", ""],
            ["Kursy zawodowe", ""],
            ["Świadczenia towarzyszące (wyżywienie, transport, opieka)", ""],
          ],
        ),
        pusty(),
        akapit(`Co zmieniło się w Twojej sytuacji dzięki projektowi: ${K} ${K} ${K}`),
        sekcja("CZĘŚĆ II. OŚWIADCZENIE O SYTUACJI (właściwe zaznaczyć)"),
        cb("podjąłem/podjęłam zatrudnienie (umowa o pracę / umowa cywilnoprawna)"),
        cb("rozpocząłem/rozpoczęłam działalność gospodarczą (wpis CEIDG)"),
        cb("aktywnie poszukuję pracy (w tym: ☐ zarejestrowany/a w PUP)"),
        cb(`kontynuuję naukę / szkolenie   ☐ inna sytuacja: ${K}`),
        akapit(
          "Zobowiązuję się dostarczyć dokument potwierdzający (kopia umowy, wpis CEIDG, zaświadczenie z PUP) w terminie 4 tygodni od zakończenia udziału.",
        ),
        akapit("Oświadczam, że powyższe dane są zgodne z prawdą."),
        ...podpisy2(
          "data i podpis uczestnika",
          "przyjął: data i podpis pracownika projektu",
        ),
      ];

    default:
      return null;
  }
}
