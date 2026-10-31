"use client";

import dynamic from "next/dynamic";

/** O Leaflet acessa `window` ao carregar, então o mapa só renderiza no navegador. */
export const RaceMapLazy = dynamic(() => import("./race-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-asfalto-100" />,
});
