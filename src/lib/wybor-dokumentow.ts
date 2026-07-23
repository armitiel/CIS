/**
 * Po wejściu do generatora albo zmianie projektu/importu nie zaznaczamy
 * automatycznie żadnej osoby. Użytkownik świadomie wybiera osoby do wydruku.
 */
export function wyborDokumentowPoZmianieBazy(
  _uczestnicy: readonly { id: string }[],
): Set<string> {
  return new Set<string>();
}
