"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { MAX_FREE_KM } from "@/domain/pontos/pontos";
import { submitClaim, type ClaimState } from "./claim-actions";

export const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2 text-sm";
const label = "text-xs font-semibold text-asfalto-700";
const hint = "block text-xs text-asfalto-500";

/**
 * Envia pelo action sem o React limpar o formulário depois: se a validação falhar,
 * tudo o que a pessoa digitou continua nos campos.
 */
export function keepValuesOnSubmit(e: FormEvent<HTMLFormElement>, action: (form: FormData) => void) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  startTransition(() => action(form));
}

export const FieldError = ({ msg }: { msg?: string }) => (msg ? <span className="text-xs text-red-600">{msg}</span> : null);

export function ClaimForm({
  raceId,
  distances,
  pointsByDistance,
}: {
  raceId: string;
  distances: { km: number; label: string }[];
  pointsByDistance: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaim.bind(null, raceId), null);
  if (state?.ok) {
    return (
      <p className="rounded-xl bg-pace-500/20 p-3 text-sm font-semibold">
        Comprovação enviada! Assim que for aprovada, os pontos entram na sua conta.
      </p>
    );
  }
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={(e) => keepValuesOnSubmit(e, action)} className="grid gap-3 sm:grid-cols-2">
      {state?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <DistanceField distances={distances} pointsByDistance={pointsByDistance} error={errors.distanceKm?.[0]} defaultValue={state?.values?.distanceKm} />
      <ClaimDetailsFields errors={errors} values={state?.values} />
      <div className="sm:col-span-2">
        <button disabled={pending} className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
          {pending ? "Enviando…" : "Enviar comprovação"}
        </button>
      </div>
    </form>
  );
}

/**
 * Dados da comprovação, iguais na página da prova e na Área Premium: tempo oficial, nome completo,
 * número de peito e o link do resultado. `values` devolve o que a pessoa digitou quando algo falha.
 */
export function ClaimDetailsFields({ errors, values }: { errors: Record<string, string[]>; values?: Record<string, string> }) {
  return (
    <>
      <label className="block space-y-1">
        <span className={label}>Tempo oficial</span>
        <input
          name="finishTime"
          required
          inputMode="numeric"
          pattern="(\d{1,2}:)?[0-5]?\d:[0-5]\d"
          placeholder="Ex.: 52:30 ou 1:48:05"
          defaultValue={values?.finishTime}
          className={field}
        />
        <span className={hint}>Tempo líquido do resultado oficial (h:mm:ss ou mm:ss).</span>
        <FieldError msg={errors.finishTime?.[0]} />
      </label>
      <label className="block space-y-1">
        <span className={label}>Nome completo de quem correu</span>
        <input name="runnerName" required maxLength={120} autoComplete="name" defaultValue={values?.runnerName} className={field} />
        <span className={hint}>Como aparece no resultado oficial da prova.</span>
        <FieldError msg={errors.runnerName?.[0]} />
      </label>
      <label className="block space-y-1">
        <span className={label}>Número de peito</span>
        <input name="bibNumber" required maxLength={20} defaultValue={values?.bibNumber} className={field} />
        <FieldError msg={errors.bibNumber?.[0]} />
      </label>
      <label className="block space-y-1 sm:col-span-2">
        <span className={label}>Link do comprovante</span>
        <input name="proofUrl" type="url" required placeholder="https://" defaultValue={values?.proofUrl} className={field} />
        <span className={hint}>Página do resultado oficial da prova ou a atividade da prova no Strava, com fotos.</span>
        <FieldError msg={errors.proofUrl?.[0]} />
      </label>
    </>
  );
}

/**
 * Distância corrida: lista as distâncias da prova; se a prova não tem nenhuma cadastrada
 * (comum nas importadas), o corredor digita os km e a análise confere.
 */
export function DistanceField({
  distances,
  pointsByDistance,
  error,
  defaultValue,
}: {
  distances: { km: number; label: string }[];
  pointsByDistance: Record<string, number>;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className={label}>Distância que você correu</span>
      {distances.length ? (
        <select name="distanceKm" required className={field} defaultValue={defaultValue ?? (distances.length === 1 ? String(distances[0].km) : "")}>
          <option value="" disabled>
            Escolha
          </option>
          {distances.map((d) => (
            <option key={d.km} value={d.km}>
              {d.label} · {pointsByDistance[String(d.km)]} pontos
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            name="distanceKm"
            type="number"
            inputMode="decimal"
            min={1}
            max={MAX_FREE_KM}
            step={0.1}
            required
            placeholder="Ex.: 10"
            defaultValue={defaultValue}
            className={field}
          />
          <span className={hint}>Em km. A equipe confere com o comprovante na análise.</span>
        </>
      )}
      <FieldError msg={error} />
    </label>
  );
}
