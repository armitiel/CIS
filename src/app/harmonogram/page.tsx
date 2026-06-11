import ModulWBudowie from "@/components/ModulWBudowie";

export default function Harmonogram() {
  return (
    <ModulWBudowie
      tytul="Kadra i harmonogram zajęć"
      opis="Plan zajęć, grupy warsztatowe i karty czasu pracy"
      etap="etap E4 — zgodnie z koncepcją"
      funkcje={[
        "Plan zajęć: warsztaty, grupy, prowadzący, sale",
        "Kontrola ustawowego limitu maks. 10 uczestników na instruktora zawodu",
        "Karty czasu pracy kadry generowane z harmonogramu",
        "Widok „moje zajęcia” dla każdego pracownika",
      ]}
    />
  );
}
