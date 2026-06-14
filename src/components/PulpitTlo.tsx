"use client";

// Spokojna, animowana warstwa tła dla widoku „Pulpit".
// Powoli przelewający się płyn w zielonej palecie aplikacji.
// Kolory pochodzą z tokenów CSS (var(--color-...)), więc tło
// automatycznie dopasowuje się do motywu jasnego i ciemnego.
// Respektuje systemowe ustawienie „ogranicz ruch".

import { useEffect, useState } from "react";

export default function PulpitTlo() {
  const [ruch, setRuch] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ustaw = () => setRuch(!mq.matches);
    ustaw();
    mq.addEventListener("change", ustaw);
    return () => mq.removeEventListener("change", ustaw);
  }, []);

  return (
    <div
      aria-hidden
      className="anim-fade-in pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 1024"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Warstwa tylna — najbledsza */}
        <g style={{ color: "var(--color-green-bar)" }} opacity="0.06">
          <path fill="currentColor">
            {ruch && (
              <animate
                attributeName="d"
                dur="26s"
                repeatCount="indefinite"
                values="
                  M0,520 C260,440 460,600 720,540 C980,480 1180,600 1440,520 L1440,1024 L0,1024 Z;
                  M0,545 C280,620 480,460 720,530 C960,600 1200,470 1440,555 L1440,1024 L0,1024 Z;
                  M0,520 C260,440 460,600 720,540 C980,480 1180,600 1440,520 L1440,1024 L0,1024 Z"
              />
            )}
            {!ruch && (
              <animate attributeName="d" dur="0s" values="M0,520 C260,440 460,600 720,540 C980,480 1180,600 1440,520 L1440,1024 L0,1024 Z" />
            )}
          </path>
        </g>

        {/* Warstwa środkowa */}
        <g style={{ color: "var(--color-green-bar)" }} opacity="0.1">
          <path fill="currentColor">
            {ruch && (
              <animate
                attributeName="d"
                dur="21s"
                repeatCount="indefinite"
                values="
                  M0,650 C240,580 480,720 720,660 C960,600 1200,730 1440,650 L1440,1024 L0,1024 Z;
                  M0,668 C260,740 500,600 720,655 C940,710 1190,595 1440,675 L1440,1024 L0,1024 Z;
                  M0,650 C240,580 480,720 720,660 C960,600 1200,730 1440,650 L1440,1024 L0,1024 Z"
              />
            )}
            {!ruch && (
              <animate attributeName="d" dur="0s" values="M0,650 C240,580 480,720 720,660 C960,600 1200,730 1440,650 L1440,1024 L0,1024 Z" />
            )}
          </path>
        </g>

        {/* Warstwa przednia — kolor wiodący */}
        <g style={{ color: "var(--color-primary)" }} opacity="0.13">
          <path fill="currentColor">
            {ruch && (
              <animate
                attributeName="d"
                dur="17s"
                repeatCount="indefinite"
                values="
                  M0,790 C260,730 480,850 720,800 C960,750 1200,860 1440,795 L1440,1024 L0,1024 Z;
                  M0,805 C240,870 500,750 720,795 C940,840 1200,740 1440,810 L1440,1024 L0,1024 Z;
                  M0,790 C260,730 480,850 720,800 C960,750 1200,860 1440,795 L1440,1024 L0,1024 Z"
              />
            )}
            {!ruch && (
              <animate attributeName="d" dur="0s" values="M0,790 C260,730 480,850 720,800 C960,750 1200,860 1440,795 L1440,1024 L0,1024 Z" />
            )}
          </path>
        </g>

        {/* Leniwie unoszące się bąbelki */}
        {ruch && (
          <g style={{ color: "var(--color-primary)" }}>
            <circle cx="300" cy="700" r="7" fill="currentColor" opacity="0.12">
              <animate attributeName="cy" values="1024;220" dur="24s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.12;0" dur="24s" repeatCount="indefinite" />
            </circle>
            <circle cx="760" cy="760" r="5" fill="currentColor" opacity="0.1">
              <animate attributeName="cy" values="1024;300" dur="30s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.1;0" dur="30s" repeatCount="indefinite" />
            </circle>
            <circle cx="1120" cy="730" r="9" fill="currentColor" opacity="0.09">
              <animate attributeName="cy" values="1024;260" dur="34s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.09;0" dur="34s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}
