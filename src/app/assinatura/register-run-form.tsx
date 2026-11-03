"use client";

import { useActionState, useState } from "react";
import { UFS } from "@/config/corridas";
import { OTHER_RACE } from "@/domain/pontos/pontos";
import { pontos } from "@/config/pontos";
import type { ClaimState } from "@/domain/pontos/enviar";
import { ClaimDetailsFields, DistanceField, field, FieldError, keepValuesOnSubmit } from "../corrida/[slug]/claim-form";
import { registerRun } from "./actions";

export type RunOption = {
  id: string;
  label: string;
  distances: { km: number; label: string }[];
  pointsByDistance: Record<string, number>;
};

const label = "text-xs font-semibold text-asfalto-700";

/**
 * Registro de corrida concluída para análise. A prova vem da lista do calendário ou, se não estiver
 * nela, o corredor informa nome, data e local. `today` e `earliest` limitam a data (aaaa-mm-dd).
 */
export function RegisterRunForm({ races, today, earliest }: { races: RunOption[]; today: string; earliest: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(registerRun, null);
  // Sem provas na lista, já começa no modo "informar a prova"
  const [raceId, setRaceId] = useState(races.length ? "" : OTHER_RACE);
  const race = races.find((r) => r.id === raceId);
  const custom = raceId === OTHER_RACE;
  const errors = state?.errors ?? {};
  const values = state?.values;

  if (state?.ok) {
    return (
      <div className="space-y-3 rounded-xl bg-pace-500/20 p-4 text-sm">
        <p className="font-semibold">Corrida enviada para análise. Assim que for aprovada, os pontos entram no ranking.</p>
        <button type="button" onClick={() => window.location.reload()} className="font-semibold text-largada-700 underline">
          Registrar outra corrida
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => keepValuesOnSubmit(e, action)} className="grid gap-3 sm:grid-cols-2">
      {state?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <label className="block space-y-1 sm:col-span-2">
        <span className={label}>Prova que você correu</span>
        <select name="raceId" required value={raceId} onChange={(e) => setRaceId(e.target.value)} className={field}>
          <option value="" disabled>
            Escolha a prova
          </option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
          <option value={OTHER_RACE}>Minha prova não está na lista</option>
        </select>
        <span className="block text-xs text-asfalto-500">
          A lista traz as provas do calendário de hoje e dos últimos {pontos.diasNaLista} dias. Correu uma mais antiga ou que não está aqui? Escolha
          &quot;Minha prova não está na lista&quot; e preencha nome, data e cidade.
        </span>
        <FieldError msg={errors.raceId?.[0]} />
      </label>

      {custom && (
        <>
          <label className="block space-y-1 sm:col-span-2">
            <span className={label}>Nome da prova</span>
            <input name="customRaceName" required minLength={3} maxLength={120} placeholder="Ex.: Corrida de São Silvestre" defaultValue={values?.customRaceName} className={field} />
            <FieldError msg={errors.customRaceName?.[0]} />
          </label>
          <label className="block space-y-1">
            <span className={label}>Data da prova</span>
            <input name="customRaceDate" type="date" required min={earliest} max={today} defaultValue={values?.customRaceDate} className={field} />
            <FieldError msg={errors.customRaceDate?.[0]} />
          </label>
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <label className="block space-y-1">
              <span className={label}>Cidade</span>
              <input name="customCity" required minLength={2} maxLength={80} defaultValue={values?.customCity} className={field} />
              <FieldError msg={errors.customCity?.[0]} />
            </label>
            <label className="block space-y-1">
              <span className={label}>UF</span>
              <select name="customState" required defaultValue={values?.customState ?? ""} className={field}>
                <option value="" disabled>
                  UF
                </option>
                {UFS.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </select>
              <FieldError msg={errors.customState?.[0]} />
            </label>
          </div>
        </>
      )}

      {/* A distância depende da prova escolhida; a chave recria o campo ao trocar de prova */}
      <div key={raceId}>
        <DistanceField
          distances={race?.distances ?? []}
          pointsByDistance={race?.pointsByDistance ?? {}}
          error={errors.distanceKm?.[0]}
          defaultValue={values?.distanceKm}
        />
      </div>
      <ClaimDetailsFields errors={errors} values={values} />
      <div className="sm:col-span-2">
        <button
          disabled={pending || !raceId}
          className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar para análise"}
        </button>
      </div>
    </form>
  );
}
