"""Jednorazowa, powtarzalna aktualizacja znaczników w szablonach SWA A-01/B-01."""

from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
WZORY = ROOT / "public" / "wzory"


def update_docx(filename: str, replacements: list[tuple[str, str]]) -> None:
    path = WZORY / filename
    with ZipFile(path, "r") as source:
        document_xml = source.read("word/document.xml").decode("utf-8")
        entries = [(entry, source.read(entry.filename)) for entry in source.infolist()]
        changed = False
        for old, new in replacements:
            count = document_xml.count(old)
            if count == 1:
                document_xml = document_xml.replace(old, new, 1)
                changed = True
            elif count == 0 and new in document_xml:
                continue
            else:
                raise RuntimeError(
                    f"{filename}: oczekiwano jednego wystąpienia {old!r}, znaleziono {count}"
                )

        if not changed:
            print(f"{filename}: wzór już aktualny")
            return

    with NamedTemporaryFile(delete=False, suffix=".docx", dir=path.parent) as tmp:
        tmp_path = Path(tmp.name)
    try:
        with ZipFile(tmp_path, "w") as target:
            for entry, original_data in entries:
                data = (
                    document_xml.encode("utf-8")
                    if entry.filename == "word/document.xml"
                    else original_data
                )
                target.writestr(entry, data)
        tmp_path.replace(path)
    finally:
        tmp_path.unlink(missing_ok=True)

    print(f"{filename}: zaktualizowano")


update_docx(
    "SWA_A-01_Pakiet_zgloszeniowy_uczestnika_szablon.docx",
    [
        ("☐ Kobieta     ☐ Mężczyzna", "{{cb_kobieta}} Kobieta     {{cb_mezczyzna}} Mężczyzna"),
        ("☐ Miasto     ☐ Wieś / teren wiejski", "{{cb_miasto}} Miasto     {{cb_wies}} Wieś / teren wiejski"),
        ("☐  Osoba pracująca", "{{cb_swa_pracujaca}} Osoba pracująca"),
        ("☐  Osoba bezrobotna (zarejestrowana w PUP)", "{{cb_swa_bezrob_zarej}} Osoba bezrobotna (zarejestrowana w PUP)"),
        ("☐  Osoba bezrobotna (niezarejestrowana)", "{{cb_swa_bezrob_niezarej}} Osoba bezrobotna (niezarejestrowana)"),
        ("☐  Osoba bierna zawodowo", "{{cb_swa_bierna}} Osoba bierna zawodowo"),
        ("☐  Emeryt/rencista", "{{cb_swa_emeryt_rencista}} Emeryt/rencista"),
        ("☐  Podstawowe", "{{cb_swa_wyk_podstawowe}} Podstawowe"),
        ("☐  Gimnazjalne", "{{cb_swa_wyk_gimnazjalne}} Gimnazjalne"),
        ("☐  Ponadgimnazjalne / średnie", "{{cb_swa_wyk_srednie}} Ponadgimnazjalne / średnie"),
        ("☐  Policealne", "{{cb_swa_wyk_policealne}} Policealne"),
        ("☐  Wyższe", "{{cb_swa_wyk_wyzsze}} Wyższe"),
        ("☐  NIE – nie posiadam orzeczenia o niepełnosprawności", "{{cb_swa_niepelnosprawnosc_nie}} NIE – nie posiadam orzeczenia o niepełnosprawności"),
        ("☐  TAK – posiadam orzeczenie o niepełnosprawności", "{{cb_swa_niepelnosprawnosc_tak}} TAK – posiadam orzeczenie o niepełnosprawności"),
        ("☐ I cykl (2026)     ☐ II cykl (2027)", "{{cb_swa_cykl1}} I cykl (2026)     {{cb_swa_cykl2}} II cykl (2027)"),
        ("{{cb_swa_pracujaca}}  Osoba", "{{cb_swa_pracujaca}} Osoba"),
        ("{{cb_swa_bezrob_zarej}}  Osoba", "{{cb_swa_bezrob_zarej}} Osoba"),
        ("{{cb_swa_bezrob_niezarej}}  Osoba", "{{cb_swa_bezrob_niezarej}} Osoba"),
        ("{{cb_swa_bierna}}  Osoba", "{{cb_swa_bierna}} Osoba"),
        ("{{cb_swa_emeryt_rencista}}  Emeryt", "{{cb_swa_emeryt_rencista}} Emeryt"),
        ("{{cb_swa_wyk_podstawowe}}  Podstawowe", "{{cb_swa_wyk_podstawowe}} Podstawowe"),
        ("{{cb_swa_wyk_gimnazjalne}}  Gimnazjalne", "{{cb_swa_wyk_gimnazjalne}} Gimnazjalne"),
        ("{{cb_swa_wyk_srednie}}  Ponadgimnazjalne", "{{cb_swa_wyk_srednie}} Ponadgimnazjalne"),
        ("{{cb_swa_wyk_policealne}}  Policealne", "{{cb_swa_wyk_policealne}} Policealne"),
        ("{{cb_swa_wyk_wyzsze}}  Wyższe", "{{cb_swa_wyk_wyzsze}} Wyższe"),
        ("{{cb_swa_niepelnosprawnosc_nie}}  NIE", "{{cb_swa_niepelnosprawnosc_nie}} NIE"),
        ("{{cb_swa_niepelnosprawnosc_tak}}  TAK", "{{cb_swa_niepelnosprawnosc_tak}} TAK"),
    ],
)

update_docx(
    "SWA_B-01_Umowa_uczestnictwa_w_projekcie_szablon.docx",
    [
        ("zawarta w dniu ........................ r. w ........................................", "zawarta w dniu {{data_dokumentu_kropki}} r. w {{miejsce_umowy}}"),
        ("Panią/Panem:", "{{forma_umowy}}:"),
        ("zamieszkałą/ym:", "{{zamieszkaly_umowa}}:"),
        ("zwaną/ym dalej ", "{{zwany_umowa}}"),
        ("„Uczestnikiem/Uczestniczką projektu”.", ""),
        ("SWA/G-01", "SWA/C-05"),
        (" {{imie_nazwisko}}, ", "{{imie_nazwisko}}, "),
        (" {{pesel}}, ", "{{pesel}}, "),
        (" {{adres}}, ", "{{adres}}, "),
    ],
)
