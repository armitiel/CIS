import ModulWBudowie from "@/components/ModulWBudowie";

export default function Dokumenty() {
  return (
    <ModulWBudowie
      tytul="Generator dokumentacji"
      opis="Szablony, silnik reguł i seryjne generowanie dokumentów projektu"
      etap="etap E5/E6 — moduł kluczowy koncepcji"
      funkcje={[
        "Biblioteka szablonów docx ze znacznikami pól (A-01, deklaracje, IŚR, listy obecności, zaświadczenia)",
        "Silnik reguł: który dokument, dla kogo i kiedy jest wymagany",
        "Generowanie pakietu dokumentów dla uczestnika lub seryjnie dla grupy",
        "Raport braków i rozbieżności między kartoteką a dokumentami",
        "Konfigurator projektów — rozpoznawanie specyfikacji wniosku (kolejne projekty Stowarzyszenia)",
      ]}
    />
  );
}
