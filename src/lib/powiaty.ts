// Powiaty RP wg województw (TERYT): 314 powiatów ziemskich + 66 miast na prawach
// powiatu = 380 jednostek. Źródło powiatów ziemskich: rejestr TERYT GUS
// (dataset ryczek02/Polskie-jednostki-administracyjne). Miasta na prawach powiatu
// dopisane ręcznie (w SOWA występują jako powiat — nazwa miasta).
// Klucz = nazwa województwa małymi literami, zgodna z SLOWNIK_WOJEWODZTWA.

const SUROWE: Record<string, string[]> = {
  dolnośląskie: [
    "bolesławiecki", "dzierżoniowski", "głogowski", "górowski", "jaworski",
    "karkonoski", "kamiennogórski", "kłodzki", "legnicki", "lubański",
    "lubiński", "lwówecki", "milicki", "oleśnicki", "oławski", "polkowicki",
    "strzeliński", "średzki", "świdnicki", "trzebnicki", "wałbrzyski",
    "wołowski", "wrocławski", "ząbkowicki", "zgorzelecki", "złotoryjski",
    "Jelenia Góra", "Legnica", "Wrocław", "Wałbrzych",
  ],
  "kujawsko-pomorskie": [
    "aleksandrowski", "brodnicki", "bydgoski", "chełmiński",
    "golubsko-dobrzyński", "grudziądzki", "inowrocławski", "lipnowski",
    "mogileński", "nakielski", "radziejowski", "rypiński", "sępoleński",
    "świecki", "toruński", "tucholski", "wąbrzeski", "włocławski", "żniński",
    "Bydgoszcz", "Grudziądz", "Toruń", "Włocławek",
  ],
  lubelskie: [
    "bialski", "biłgorajski", "chełmski", "hrubieszowski", "janowski",
    "krasnostawski", "kraśnicki", "lubartowski", "lubelski", "łęczyński",
    "łukowski", "opolski", "parczewski", "puławski", "radzyński", "rycki",
    "świdnicki", "tomaszowski", "włodawski", "zamojski",
    "Biała Podlaska", "Chełm", "Lublin", "Zamość",
  ],
  lubuskie: [
    "gorzowski", "krośnieński", "międzyrzecki", "nowosolski", "słubicki",
    "strzelecko-drezdenecki", "sulęciński", "świebodziński", "zielonogórski",
    "żagański", "żarski", "wschowski",
    "Gorzów Wielkopolski", "Zielona Góra",
  ],
  łódzkie: [
    "bełchatowski", "kutnowski", "łaski", "łęczycki", "łowicki",
    "łódzki wschodni", "opoczyński", "pabianicki", "pajęczański",
    "piotrkowski", "poddębicki", "radomszczański", "rawski", "sieradzki",
    "skierniewicki", "tomaszowski", "wieluński", "wieruszowski",
    "zduńskowolski", "zgierski", "brzeziński",
    "Łódź", "Piotrków Trybunalski", "Skierniewice",
  ],
  małopolskie: [
    "bocheński", "brzeski", "chrzanowski", "dąbrowski", "gorlicki",
    "krakowski", "limanowski", "miechowski", "myślenicki", "nowosądecki",
    "nowotarski", "olkuski", "oświęcimski", "proszowicki", "suski",
    "tarnowski", "tatrzański", "wadowicki", "wielicki",
    "Kraków", "Nowy Sącz", "Tarnów",
  ],
  mazowieckie: [
    "białobrzeski", "ciechanowski", "garwoliński", "gostyniński",
    "grodziski", "grójecki", "kozienicki", "legionowski", "lipski",
    "łosicki", "makowski", "miński", "mławski", "nowodworski", "ostrołęcki",
    "ostrowski", "otwocki", "piaseczyński", "płocki", "płoński", "pruszkowski",
    "przasnyski", "przysuski", "pułtuski", "radomski", "siedlecki",
    "sierpecki", "sochaczewski", "sokołowski", "szydłowiecki",
    "warszawski zachodni", "węgrowski", "wołomiński", "wyszkowski",
    "zwoleński", "żuromiński", "żyrardowski",
    "Warszawa", "Ostrołęka", "Płock", "Radom", "Siedlce",
  ],
  opolskie: [
    "brzeski", "głubczycki", "kędzierzyńsko-kozielski", "kluczborski",
    "krapkowicki", "namysłowski", "nyski", "oleski", "opolski", "prudnicki",
    "strzelecki",
    "Opole",
  ],
  podkarpackie: [
    "bieszczadzki", "brzozowski", "dębicki", "jarosławski", "jasielski",
    "kolbuszowski", "krośnieński", "leżajski", "lubaczowski", "łańcucki",
    "mielecki", "niżański", "przemyski", "przeworski",
    "ropczycko-sędziszowski", "rzeszowski", "sanocki", "stalowowolski",
    "strzyżowski", "tarnobrzeski", "leski",
    "Krosno", "Przemyśl", "Rzeszów", "Tarnobrzeg",
  ],
  podlaskie: [
    "augustowski", "białostocki", "bielski", "grajewski", "hajnowski",
    "kolneński", "łomżyński", "moniecki", "sejneński", "siemiatycki",
    "sokólski", "suwalski", "wysokomazowiecki", "zambrowski",
    "Białystok", "Łomża", "Suwałki",
  ],
  pomorskie: [
    "bytowski", "chojnicki", "człuchowski", "gdański", "kartuski",
    "kościerski", "kwidzyński", "lęborski", "malborski", "nowodworski",
    "pucki", "słupski", "starogardzki", "tczewski", "wejherowski", "sztumski",
    "Gdańsk", "Gdynia", "Słupsk", "Sopot",
  ],
  śląskie: [
    "będziński", "bielski", "cieszyński", "częstochowski", "gliwicki",
    "kłobucki", "lubliniecki", "mikołowski", "myszkowski", "pszczyński",
    "raciborski", "rybnicki", "tarnogórski", "bieruńsko-lędziński",
    "wodzisławski", "zawierciański", "żywiecki",
    "Bielsko-Biała", "Bytom", "Chorzów", "Częstochowa", "Dąbrowa Górnicza",
    "Gliwice", "Jastrzębie-Zdrój", "Jaworzno", "Katowice", "Mysłowice",
    "Piekary Śląskie", "Ruda Śląska", "Rybnik", "Siemianowice Śląskie",
    "Sosnowiec", "Świętochłowice", "Tychy", "Zabrze", "Żory",
  ],
  świętokrzyskie: [
    "buski", "jędrzejowski", "kazimierski", "kielecki", "konecki",
    "opatowski", "ostrowiecki", "pińczowski", "sandomierski", "skarżyski",
    "starachowicki", "staszowski", "włoszczowski",
    "Kielce",
  ],
  "warmińsko-mazurskie": [
    "bartoszycki", "braniewski", "działdowski", "elbląski", "ełcki",
    "giżycki", "iławski", "kętrzyński", "lidzbarski", "mrągowski", "nidzicki",
    "nowomiejski", "olecki", "olsztyński", "ostródzki", "piski",
    "szczycieński", "gołdapski", "węgorzewski",
    "Elbląg", "Olsztyn",
  ],
  wielkopolskie: [
    "chodzieski", "czarnkowsko-trzcianecki", "gnieźnieński", "gostyński",
    "grodziski", "jarociński", "kaliski", "kępiński", "kolski", "koniński",
    "kościański", "krotoszyński", "leszczyński", "międzychodzki",
    "nowotomyski", "obornicki", "ostrowski", "ostrzeszowski", "pilski",
    "pleszewski", "poznański", "rawicki", "słupecki", "szamotulski",
    "średzki", "śremski", "turecki", "wągrowiecki", "wolsztyński",
    "wrzesiński", "złotowski",
    "Kalisz", "Konin", "Leszno", "Poznań",
  ],
  zachodniopomorskie: [
    "białogardzki", "choszczeński", "drawski", "goleniowski", "gryficki",
    "gryfiński", "kamieński", "kołobrzeski", "koszaliński", "myśliborski",
    "policki", "pyrzycki", "sławieński", "stargardzki", "szczecinecki",
    "świdwiński", "wałecki", "łobeski",
    "Koszalin", "Szczecin", "Świnoujście",
  ],
};

/** Mapa: województwo → posortowana alfabetycznie lista powiatów (PL). */
export const POWIATY_WG_WOJEWODZTWA: Record<string, string[]> = Object.fromEntries(
  Object.entries(SUROWE).map(([woj, lista]) => [
    woj,
    [...lista].sort((a, b) => a.localeCompare(b, "pl")),
  ]),
);

/** Lista powiatów dla danego województwa (pusta, gdy nie wybrano/nieznane). */
export function powiatyDlaWojewodztwa(wojewodztwo?: string): string[] {
  if (!wojewodztwo) return [];
  return POWIATY_WG_WOJEWODZTWA[wojewodztwo] ?? [];
}
