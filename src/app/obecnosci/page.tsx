import ModulWBudowie from "@/components/ModulWBudowie";

export default function Obecnosci() {
  return (
    <ModulWBudowie
      tytul="Obecności i świadczenia"
      opis="Listy obecności i naliczanie świadczeń integracyjnych"
      etap="etap E2 — zgodnie z koncepcją"
      funkcje={[
        "Listy obecności per zajęcia, odhaczane na tablecie lub telefonie",
        "Kategorie nieobecności: usprawiedliwiona, nieusprawiedliwiona, zwolnienie lekarskie",
        "Automatyczne naliczanie świadczeń integracyjnych na podstawie frekwencji",
        "Alerty przekroczenia progów nieobecności na pulpicie koordynatora",
        "Zestawienia frekwencji do sprawozdań i kontroli",
      ]}
    />
  );
}
