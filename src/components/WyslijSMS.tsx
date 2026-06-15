"use client";

// Wysyłka SMS do uczestników (Zadarma) z treścią dynamiczną powiązaną z
// harmonogramem. Pola dynamiczne ({{...}}) prezentowane jako kolorowe kapsułki
// — także w samym polu edycji treści (edytor contenteditable). Wybór terminu z
// harmonogramu zasila pola {{data}}, {{godzina}}, {{nazwa}}. Numery do +48.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  normalizujNumer,
  wyslijSMS,
  wypelnijSzablon,
  type WynikSMS,
} from "@/lib/sms";
import { useProjekt } from "@/components/ProjektProvider";
import { useZajecia } from "@/lib/use-zajecia";
import type { Uczestnik } from "@/lib/types";

type GrupaPola = "harmonogram" | "uczestnik" | "projekt";

// Metadane pól dynamicznych: etykieta + przynależność (kolor kapsułki).
const POLA_META: Record<string, { label: string; grupa: GrupaPola }> = {
  data: { label: "data", grupa: "harmonogram" },
  godzina: { label: "godzina", grupa: "harmonogram" },
  nazwa: { label: "nazwa zajęć", grupa: "harmonogram" },
  imie: { label: "imię", grupa: "uczestnik" },
  nazwisko: { label: "nazwisko", grupa: "uczestnik" },
  grupa: { label: "grupa", grupa: "uczestnik" },
  projekt: { label: "projekt", grupa: "projekt" },
};

const KOLOR_GRUPY: Record<GrupaPola, string> = {
  harmonogram: "bg-blue-soft text-blue-ink",
  uczestnik: "bg-green-soft text-primary-strong",
  projekt: "bg-amber-soft text-amber-ink",
};

const KLASA_NIEZNANE = "bg-red-soft text-red-ink";
const CHIP_CLS =
  "rounded-full px-2 py-0.5 text-[12px] font-semibold mx-[1px] align-baseline";

const GRUPY_POL: { naglowek: string; ikona: string; pola: string[] }[] = [
  { naglowek: "Z harmonogramu", ikona: "event", pola: ["data", "godzina", "nazwa"] },
  { naglowek: "Dane uczestnika", ikona: "person", pola: ["imie", "nazwisko", "grupa"] },
  { naglowek: "Projekt", ikona: "workspaces", pola: ["projekt"] },
];

const POLA_HARMONOGRAM = ["data", "godzina", "nazwa"];
const DOW_PL = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const p2 = (n: number) => String(n).padStart(2, "0");
function fmtData(iso: string): string {
  const d = parseISO(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function etykietaTerminu(z: {
  data: string;
  godzina: string;
  nazwa: string;
  grupa: string;
}): string {
  const d = parseISO(z.data);
  const dzien = `${DOW_PL[d.getDay()]} ${p2(d.getDate())}.${p2(d.getMonth() + 1)}`;
  const grupa = z.grupa && z.grupa !== "—" ? ` · gr. ${z.grupa}` : "";
  return `${dzien} · ${z.godzina || "—"} · ${z.nazwa || "zajęcia"}${grupa}`;
}

// Licznik SMS wg pojemności: polskie znaki/typografia → UCS-2 (70/67),
// czysty ASCII (GSM-7) → 160/153 na segment.
function pojemnoscSMS(tekst: string): {
  znaki: number;
  sms: number;
  ucs2: boolean;
} {
  const znaki = tekst.length;
  const ucs2 = [...tekst].some((ch) => ch.charCodeAt(0) > 127);
  const poj = ucs2 ? 70 : 160;
  const seg = ucs2 ? 67 : 153;
  const sms = znaki === 0 ? 0 : znaki <= poj ? 1 : Math.ceil(znaki / seg);
  return { znaki, sms, ucs2 };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Rozbija szablon na segmenty tekstu i pola {{...}}.
function tokenizuj(s: string): { typ: "txt" | "pole"; val: string }[] {
  const parts: { typ: "txt" | "pole"; val: string }[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ typ: "txt", val: s.slice(last, m.index) });
    parts.push({ typ: "pole", val: m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ typ: "txt", val: s.slice(last) });
  return parts;
}

function klasaPola(k: string): string {
  return POLA_META[k] ? KOLOR_GRUPY[POLA_META[k].grupa] : KLASA_NIEZNANE;
}
function etykietaPola(k: string): string {
  return POLA_META[k]?.label ?? `${k}?`;
}

// HTML kapsułki w edytorze (nieedytowalna).
function chipHTML(k: string): string {
  return `<span class="${CHIP_CLS} ${klasaPola(k)}" data-k="${escapeHtml(
    k,
  )}" contenteditable="false">${escapeHtml(etykietaPola(k))}</span>`;
}
function buildHTML(szablon: string): string {
  return tokenizuj(szablon)
    .map((t) => (t.typ === "txt" ? escapeHtml(t.val) : chipHTML(t.val)))
    .join("");
}

// DOM edytora → szablon ({{pole}} z kapsułek, tekst z węzłów tekstowych).
function parseWezel(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.dataset && el.dataset.k) return `{{${el.dataset.k}}}`;
  if (el.tagName === "BR") return "\n";
  let s = "";
  el.childNodes.forEach((c) => (s += parseWezel(c)));
  return s;
}
function parseEdytor(el: HTMLElement): string {
  let s = "";
  el.childNodes.forEach((c) => {
    if (c.nodeType === Node.ELEMENT_NODE && (c as HTMLElement).tagName === "DIV") {
      s += "\n" + parseWezel(c);
    } else {
      s += parseWezel(c);
    }
  });
  return s;
}

interface UchwytEdytora {
  wstaw: (k: string) => void;
}

// Edytor treści z kolorowymi kapsułkami pól dynamicznych.
const EdytorTresci = forwardRef<
  UchwytEdytora,
  { value: string; onChange: (s: string) => void; className?: string }
>(function EdytorTresci({ value, onChange, className }, ref) {
  const elRef = useRef<HTMLDivElement>(null);
  // ostatnia wartość wygenerowana przez sam edytor (by nie resetować kursora)
  const wewn = useRef<string>("");

  useEffect(() => {
    if (value !== wewn.current && elRef.current) {
      elRef.current.innerHTML = buildHTML(value);
      wewn.current = value;
    }
  }, [value]);

  function emit() {
    if (!elRef.current) return;
    const s = parseEdytor(elRef.current);
    wewn.current = s;
    onChange(s);
  }

  useImperativeHandle(ref, () => ({
    wstaw(k: string) {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      const chip = document.createElement("span");
      chip.className = `${CHIP_CLS} ${klasaPola(k)}`;
      chip.dataset.k = k;
      chip.contentEditable = "false";
      chip.textContent = etykietaPola(k);
      const spacer = document.createTextNode(" ");
      let range: Range;
      if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
        range.deleteContents();
      } else {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.insertNode(spacer);
      range.insertNode(chip);
      range.setStartAfter(spacer);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      emit();
    },
  }));

  return (
    <div
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      onInput={emit}
      className={className}
    />
  );
});

export default function WyslijSMS({
  uczestnicy,
  projektSkrot,
  onClose,
}: {
  uczestnicy: Uczestnik[];
  projektSkrot: string;
  onClose: () => void;
}) {
  const { projekt } = useProjekt();
  const { zajecia } = useZajecia(projekt.id);

  const [szablon, setSzablon] = useState(
    "Dzień dobry {{imie}}, przypominamy o zajęciach „{{nazwa}}” dnia {{data}} o {{godzina}} (grupa {{grupa}}). Pozdrawiamy, {{projekt}}.",
  );
  const [grupa, setGrupa] = useState<string>("wszyscy");
  const [terminId, setTerminId] = useState<string>("");
  const [wysyla, setWysyla] = useState(false);
  const [wyniki, setWyniki] = useState<WynikSMS[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const edytorRef = useRef<UchwytEdytora>(null);

  // tylko nadchodzące terminy (od dziś) — nie wysyłamy przypomnień wstecz
  const terminy = useMemo(() => {
    const t = new Date();
    const dzis = `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`;
    return [...zajecia]
      .filter((z) => z.data >= dzis)
      .sort((a, b) =>
        a.data === b.data
          ? a.godzina.localeCompare(b.godzina)
          : a.data.localeCompare(b.data),
      );
  }, [zajecia]);
  const termin = useMemo(
    () => terminy.find((z) => z.id === terminId) ?? null,
    [terminy, terminId],
  );

  const grupy = useMemo(
    () =>
      Array.from(
        new Set(
          uczestnicy
            .map((u) => u.grupa)
            .filter((g): g is string => !!g && g !== "—"),
        ),
      ).sort(),
    [uczestnicy],
  );

  const kontekst = useMemo(() => {
    const k: Record<string, string> = { projekt: projektSkrot };
    if (termin) {
      k.data = fmtData(termin.data);
      k.godzina = termin.godzinaDo
        ? `${termin.godzina}–${termin.godzinaDo}`
        : termin.godzina;
      k.nazwa = termin.nazwa;
    }
    return k;
  }, [termin, projektSkrot]);

  const odbiorcy = useMemo(() => {
    return uczestnicy
      .filter((u) => grupa === "wszyscy" || u.grupa === grupa)
      .map((u) => ({ u, numer: normalizujNumer(u.sowa?.telefon) }));
  }, [uczestnicy, grupa]);

  const [odznaczeni, setOdznaczeni] = useState<Set<string>>(new Set());
  const wybrani = odbiorcy.filter((o) => o.numer && !odznaczeni.has(o.u.id));
  const odbiorcyZNumerem = odbiorcy.filter((o) => o.numer).length;
  const wszyscyZaznaczeni =
    odbiorcyZNumerem > 0 && wybrani.length === odbiorcyZNumerem;

  function zaznaczWszystkich(zazn: boolean) {
    setOdznaczeni((s) => {
      const n = new Set(s);
      for (const o of odbiorcy) {
        if (!o.numer) continue;
        if (zazn) n.delete(o.u.id);
        else n.add(o.u.id);
      }
      return n;
    });
  }

  const polaWSzablonie = useMemo(
    () => Array.from(new Set([...szablon.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))),
    [szablon],
  );
  const uzyteHarmonogram = polaWSzablonie.filter((k) =>
    POLA_HARMONOGRAM.includes(k),
  );
  const nieznanePola = polaWSzablonie.filter((k) => !POLA_META[k]);
  const wymagaTerminu = uzyteHarmonogram.length > 0 && !termin;

  const podglad =
    wybrani.length > 0
      ? wypelnijSzablon(szablon, wybrani[0].u, kontekst)
      : wypelnijSzablon(szablon, uczestnicy[0] ?? ({} as Uczestnik), kontekst);

  function przelacz(id: string) {
    setOdznaczeni((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function wyslij() {
    if (wybrani.length === 0 || wymagaTerminu) return;
    setWysyla(true);
    setBlad(null);
    setWyniki(null);
    try {
      const wiadomosci = wybrani.map((o) => ({
        numer: o.numer as string,
        tresc: wypelnijSzablon(szablon, o.u, kontekst),
      }));
      const odp = await wyslijSMS(wiadomosci);
      setWyniki(odp.wyniki);
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się wysłać SMS.");
    } finally {
      setWysyla(false);
    }
  }

  const licznikSMS = pojemnoscSMS(podglad);
  const bezNumeru = odbiorcy.filter((o) => !o.numer).length;
  const grupaTerminu = termin?.grupa && termin.grupa !== "—" ? termin.grupa : "";

  const pole =
    "rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-[oklch(0.62_0.09_152)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.2_0.02_150/0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 font-serif text-lg font-semibold text-ink-strong">
            Wyślij SMS do uczestników
          </h3>
          <button onClick={onClose} className="text-faint hover:text-ink" title="Zamknij">
            <span className="material-symbols-rounded notranslate text-[22px]">close</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-4">
          {/* Termin z harmonogramu + wybór grupy (obok siebie) */}
          <div className="rounded-xl border border-line bg-soft/50 p-3.5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <label className="th-label mb-1 block">
                  <span className="material-symbols-rounded notranslate align-middle text-[16px] text-blue-ink">
                    event
                  </span>{" "}
                  Termin z harmonogramu
                </label>
                <select
                  value={terminId}
                  onChange={(e) => setTerminId(e.target.value)}
                  className={`w-full cursor-pointer ${pole}`}
                >
                  <option value="">— nie podpinaj (pola harmonogramu puste) —</option>
                  {terminy.map((z) => (
                    <option key={z.id} value={z.id}>
                      {etykietaTerminu(z)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="th-label mb-1 block">Grupa</label>
                <select
                  value={grupa}
                  onChange={(e) => setGrupa(e.target.value)}
                  className={`w-full cursor-pointer ${pole}`}
                >
                  <option value="wszyscy">Wszyscy ({uczestnicy.length})</option>
                  {grupy.map((g) => (
                    <option key={g} value={g}>
                      Grupa {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>
                Odbiorców z numerem: <strong>{wybrani.length}</strong>
                {bezNumeru > 0 && ` · bez numeru: ${bezNumeru}`}
              </span>
              {grupaTerminu && grupa !== grupaTerminu && (
                <button
                  onClick={() => setGrupa(grupaTerminu)}
                  className="rounded-lg border border-blue-ink/30 bg-blue-soft px-2 py-1 text-[11px] font-semibold text-blue-ink hover:opacity-90"
                >
                  Ustaw grupę {grupaTerminu} z terminu
                </button>
              )}
            </div>
            {termin && (
              <p className="mt-2 text-[12px] text-muted">
                Podstawi się: data <strong>{kontekst.data}</strong>, godzina{" "}
                <strong>{kontekst.godzina}</strong>, nazwa „
                <strong>{kontekst.nazwa}</strong>".
              </p>
            )}
            {terminy.length === 0 && (
              <p className="mt-2 text-[12px] text-faint">
                Brak zajęć w harmonogramie tego projektu — dodaj je w module
                Harmonogram, aby podpiąć datę i godzinę.
              </p>
            )}
          </div>

          {/* Pola dynamiczne jako kapsułki — jedna linia, bez nagłówków */}
          <div>
            <label className="th-label mb-1.5 block">
              Wstaw pole — kliknij, aby dodać do treści
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {GRUPY_POL.flatMap((g) => g.pola).map((k) => (
                <button
                  key={k}
                  onClick={() => edytorRef.current?.wstaw(k)}
                  title={`Wstaw pole „${POLA_META[k].label}”`}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-opacity hover:opacity-80 ${KOLOR_GRUPY[POLA_META[k].grupa]}`}
                >
                  {POLA_META[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* Treść SMS — edytor z kapsułkami */}
          <div>
            <label className="th-label mb-1 block">Treść SMS</label>
            <EdytorTresci
              ref={edytorRef}
              value={szablon}
              onChange={setSzablon}
              className="min-h-[84px] w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-[oklch(0.62_0.09_152)]"
            />
          </div>

          {/* Podgląd — tytuł w stylu „Treść SMS" (label nad polem) */}
          <div>
            <label className="th-label mb-1 block">
              Podgląd (pierwszy odbiorca)
            </label>
            <div className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink">
              {podglad}
            </div>
            <p className="mt-1 text-[11px] text-faint">
              {licznikSMS.znaki} znaków · {licznikSMS.sms}{" "}
              {licznikSMS.sms === 1 ? "SMS" : "SMS-y"} ·{" "}
              {licznikSMS.ucs2
                ? "polskie znaki → 70 znaków/SMS"
                : "160 znaków/SMS"}
            </p>
          </div>

          {/* Ostrzeżenia walidacyjne */}
          {wymagaTerminu && (
            <div className="rounded-xl bg-amber-soft/50 px-4 py-2.5 text-sm text-amber-ink">
              Treść używa pól z harmonogramu ({uzyteHarmonogram.join(", ")}), ale
              nie wybrano terminu — wybierz termin powyżej, aby je uzupełnić.
            </div>
          )}
          {nieznanePola.length > 0 && (
            <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red-ink">
              Nieznane pola w treści: {nieznanePola.map((k) => `{{${k}}}`).join(", ")}.
              Zostaną wysłane dosłownie — usuń je lub użyj kapsułek powyżej.
            </div>
          )}

          {/* Lista odbiorców */}
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-mid">
                <input
                  type="checkbox"
                  checked={wszyscyZaznaczeni}
                  onChange={(e) => zaznaczWszystkich(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)]"
                />
                Zaznacz wszystkich
              </label>
              <span className="text-xs text-faint">
                {wybrani.length} / {odbiorcyZNumerem} z numerem
              </span>
            </div>
            <div className="max-h-56 divide-y divide-line-soft overflow-y-auto">
              {odbiorcy.map((o) => (
                <div
                  key={o.u.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={!!o.numer && !odznaczeni.has(o.u.id)}
                    disabled={!o.numer}
                    onChange={() => przelacz(o.u.id)}
                    className="h-4 w-4 cursor-pointer accent-[oklch(0.52_0.09_152)] disabled:opacity-40"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {o.u.nazwisko} {o.u.imie}
                  </span>
                  <span className="text-xs text-faint">
                    {o.u.grupa && o.u.grupa !== "—" ? `gr. ${o.u.grupa}` : ""}
                  </span>
                  <span
                    className={`font-mono text-xs ${o.numer ? "text-ink-mid" : "text-red-ink"}`}
                  >
                    {o.numer ?? "brak/niepoprawny numer"}
                  </span>
                </div>
              ))}
              {odbiorcy.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-faint">
                  Brak uczestników w tej grupie.
                </div>
              )}
            </div>
          </div>

          {blad && (
            <div className="rounded-xl bg-red-soft px-4 py-2.5 text-sm text-red-ink">
              {blad}
            </div>
          )}

          {wyniki && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="bg-soft px-3 py-2 text-xs font-semibold text-ink-mid">
                Wynik: {wyniki.filter((w) => w.ok).length} z {wyniki.length}{" "}
                wysłanych
              </div>
              <div className="max-h-40 divide-y divide-line-soft overflow-y-auto">
                {wyniki.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono text-ink-mid">{w.numer}</span>
                    <span className={w.ok ? "text-primary-strong" : "text-red-ink"}>
                      {w.ok ? "✓ wysłano" : `✗ ${w.info}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-soft px-6 py-4">
          <span className="text-xs text-muted">
            SMS-y są płatne (stawka Zadarma per wiadomość). Wysyłaj tylko za zgodą
            uczestników.
          </span>
          <button
            onClick={wyslij}
            disabled={wysyla || wybrani.length === 0 || wymagaTerminu}
            className="btn-primary disabled:opacity-50"
          >
            <span className="material-symbols-rounded notranslate text-[18px]">sms</span>
            {wysyla ? "Wysyłam…" : `Wyślij do ${wybrani.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
