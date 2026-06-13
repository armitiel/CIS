// Jedno źródło prawdy dla zmiennych Supabase.
// Czyści wartości z niewidzialnych znaków (BOM U+FEFF, zero-width) i białych
// znaków, które potrafią się dokleić przy kopiowaniu klucza z edytora —
// inaczej trafiają do nagłówka HTTP i psują logowanie
// ("Cannot convert argument to a ByteString ... value 65279").
const czysc = (v?: string): string | undefined =>
  v?.replace(/[﻿​‌‍⁠]/g, "").trim();

export const SUPABASE_URL = czysc(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_KEY = czysc(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
