"use client";

// Portal renderujący zawartość bezpośrednio w <body> — popupy są zawsze na
// wierzchu, niezależnie od transformów/animacji kart nadrzędnych
// (transform na przodku zmienia punkt odniesienia position: fixed).

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }: { children: React.ReactNode }) {
  const [zamontowany, setZamontowany] = useState(false);
  useEffect(() => setZamontowany(true), []);
  if (!zamontowany) return null;
  return createPortal(children, document.body);
}
