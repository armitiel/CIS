-- E8: jednorazowe czyszczenie błędnych zajęć z importu.
-- Usuwa wpisy, których nazwa jest absurdalnie długa (np. wklejony cały
-- akapit/dokument przy imporcie z Worda/PDF). Żadna prawdziwa nazwa zajęć
-- nie przekracza 200 znaków. Idempotentne — na czystej bazie nic nie usuwa.

delete from public.zajecia
where char_length(coalesce(nazwa, '')) > 200;
