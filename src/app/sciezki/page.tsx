import ModulWBudowie from "@/components/ModulWBudowie";

export default function Sciezki() {
  return (
    <ModulWBudowie
      tytul="Ścieżki IŚR / IPZS / IPR"
      opis="Indywidualne ścieżki reintegracji uczestników"
      etap="etap E3 — zgodnie z koncepcją"
      funkcje={[
        "IŚR dla wszystkich uczestników, IPZS dla bezrobotnych, IPR dla biernych zawodowo",
        "Etapy, cele i terminy przeglądów z przypomnieniami",
        "Chronologiczne wpisy kadry merytorycznej w jednym miejscu",
        "Wydruk kompletnego dokumentu ścieżki (docx/PDF) do podpisu uczestnika",
      ]}
    />
  );
}
