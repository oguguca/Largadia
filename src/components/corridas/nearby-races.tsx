"use client";

import Link from "next/link";
import { useState } from "react";
import type { RaceCard as RaceCardData } from "@/domain/corridas/queries";
import { RaceGrid } from "./race-card";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; races: RaceCardData[]; lat: number; lng: number };

/** Só pede a localização quando a pessoa toca no botão. */
export function NearbyRaces() {
  const [state, setState] = useState<State>({ kind: "idle" });

  function locate() {
    if (!("geolocation" in navigator)) {
      return setState({ kind: "error", message: "Seu navegador não permite localização." });
    }
    setState({ kind: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = +pos.coords.latitude.toFixed(4);
        const lng = +pos.coords.longitude.toFixed(4);
        try {
          const res = await fetch(`/api/corridas/perto?lat=${lat}&lng=${lng}`);
          if (!res.ok) throw new Error();
          const data: { races: (RaceCardData & { startsAt: string })[] } = await res.json();
          const races = data.races.map((r) => ({ ...r, startsAt: new Date(r.startsAt) })) as RaceCardData[];
          setState({ kind: "done", races, lat, lng });
        } catch {
          setState({ kind: "error", message: "Não foi possível carregar as provas agora." });
        }
      },
      () => setState({ kind: "error", message: "Permita o acesso à localização para ver provas perto de você." }),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  if (state.kind === "done") {
    return state.races.length ? (
      <>
        <RaceGrid races={state.races} />
        <Link
          href={`/busca?lat=${state.lat}&lng=${state.lng}&raio=150`}
          className="mt-3 inline-block text-sm font-semibold text-largada-600 hover:underline"
        >
          Ver todas perto de você →
        </Link>
      </>
    ) : (
      <p className="text-asfalto-500">Nenhuma prova cadastrada num raio de 150 km. Que tal ampliar a busca?</p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-asfalto-300 p-6 text-center">
      <p className="mb-3 text-asfalto-700">Descubra as provas num raio de até 150 km de onde você está.</p>
      <button
        onClick={locate}
        disabled={state.kind === "loading"}
        className="rounded-full bg-asfalto-950 px-5 py-2.5 font-semibold text-white hover:bg-asfalto-800 disabled:opacity-60"
      >
        {state.kind === "loading" ? "Localizando…" : "📍 Usar minha localização"}
      </button>
      {state.kind === "error" && <p className="mt-2 text-sm text-red-600">{state.message}</p>}
    </div>
  );
}
