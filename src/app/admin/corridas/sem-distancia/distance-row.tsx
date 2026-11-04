"use client";

import { useState, useTransition } from "react";
import { setRaceDistances } from "../actions";

/** Distâncias mais comuns em corridas de rua; outras entram pelo campo livre. */
const QUICK = [
  { km: 3, label: "3k" },
  { km: 4, label: "4k" },
  { km: 5, label: "5k" },
  { km: 6, label: "6k" },
  { km: 7, label: "7k" },
  { km: 8, label: "8k" },
  { km: 10, label: "10k" },
  { km: 12, label: "12k" },
  { km: 15, label: "15k" },
  { km: 21.1, label: "21k" },
  { km: 42.195, label: "42k" },
];

export type MissingRace = {
  id: string;
  name: string;
  dateLabel: string;
  place: string;
  imageUrl: string | null;
  registrationUrl: string;
  platform: string | null;
};

/** Uma prova sem distância: cartaz, link da inscrição e botões para marcar as distâncias. */
export function DistanceRow({ race }: { race: MissingRace }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = (km: number) => setPicked((p) => (p.includes(km) ? p.filter((x) => x !== km) : [...p, km]));
  // Campo livre aceita "2,5" ou "2.5; 9"
  const extra = custom
    .split(/[;\s/]+/)
    .map((v) => Number(v.replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const all = [...picked, ...extra];

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await setRaceDistances(race.id, all);
      if (res.error) setError(res.error);
      else setSaved(true);
    });

  if (saved) {
    return (
      <li className="flex items-center gap-3 rounded-2xl bg-pace-500/20 px-4 py-3 text-sm">
        <span aria-hidden>✓</span>
        <span>
          <strong>{race.name}</strong> salva com {all.map((k) => QUICK.find((q) => q.km === k)?.label ?? `${k}k`).join(", ")}.
        </span>
      </li>
    );
  }

  return (
    <li className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-asfalto-100 sm:grid-cols-[7rem_1fr]">
      {race.imageUrl ? (
        <a href={race.imageUrl} target="_blank" rel="noreferrer" title="Abrir o cartaz inteiro" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- cartaz do organizador, de domínio arbitrário */}
          <img src={race.imageUrl} alt={`Cartaz de ${race.name}`} loading="lazy" className="aspect-square w-full rounded-xl bg-asfalto-950 object-contain" />
        </a>
      ) : (
        <div className="grid aspect-square w-full place-items-center rounded-xl bg-asfalto-100 text-xs text-asfalto-500">Sem cartaz</div>
      )}

      <div className="min-w-0 space-y-3">
        <div>
          <p className="font-semibold">{race.name}</p>
          <p className="text-sm text-asfalto-500">
            {race.dateLabel} · {race.place} ·{" "}
            <a href={race.registrationUrl} target="_blank" rel="noreferrer" className="font-semibold text-largada-600 hover:underline">
              Ver na {race.platform ?? "inscrição"} ↗
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Distâncias de ${race.name}`}>
          {QUICK.map((q) => {
            const on = picked.includes(q.km);
            return (
              <button
                key={q.km}
                type="button"
                onClick={() => toggle(q.km)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ring-1 transition ${
                  on ? "bg-largada-500 text-asfalto-950 ring-largada-500" : "bg-white text-asfalto-700 ring-asfalto-300 hover:ring-asfalto-500"
                }`}
              >
                {q.label}
              </button>
            );
          })}
          <label className="flex items-center gap-1.5 text-sm text-asfalto-500">
            Outra:
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              inputMode="decimal"
              placeholder="ex.: 2,5"
              className="w-20 rounded-lg border border-asfalto-300 px-2 py-1 text-sm text-asfalto-900"
            />
            km
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || all.length === 0}
            className="rounded-xl bg-asfalto-950 px-4 py-2 text-sm font-semibold text-white hover:bg-asfalto-800 disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Salvar distâncias"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </li>
  );
}
