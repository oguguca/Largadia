"use client";

import { useState } from "react";
import { radiusOptions } from "@/config/corridas";

type Coords = { lat: number; lng: number };

/** Campo de raio com botão "usar minha localização"; envia lat/lng como inputs ocultos do formulário GET. */
export function LocationField({ initial, initialRadius }: { initial?: Coords; initialRadius?: number }) {
  const [coords, setCoords] = useState<Coords | undefined>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  function locate() {
    if (!("geolocation" in navigator)) return setStatus("error");
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4) });
        setStatus("idle");
      },
      () => setStatus("error"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-asfalto-500 uppercase">Perto de mim</legend>
      {coords && (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={locate}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            coords ? "border-largada-500 bg-largada-100 text-largada-700" : "border-asfalto-300 bg-white"
          }`}
        >
          {status === "loading" ? "Localizando…" : coords ? "📍 Localização ativa" : "Usar minha localização"}
        </button>
        <select
          name="raio"
          defaultValue={initialRadius ?? 50}
          disabled={!coords}
          aria-label="Raio em km"
          className="rounded-lg border border-asfalto-300 bg-white px-2 py-2 text-sm disabled:opacity-50"
        >
          {radiusOptions.map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </select>
      </div>
      {coords && (
        <button type="button" onClick={() => setCoords(undefined)} className="text-xs text-asfalto-500 underline">
          Remover localização
        </button>
      )}
      {status === "error" && (
        <p className="text-xs text-red-600">Não foi possível obter sua localização. Verifique a permissão do navegador.</p>
      )}
    </fieldset>
  );
}
