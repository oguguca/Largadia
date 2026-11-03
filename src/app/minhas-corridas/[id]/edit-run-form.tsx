"use client";

import { useActionState, useState } from "react";
import { CRITERIA, COMMENT_MAX } from "@/domain/biblioteca/biblioteca";
import { StarInput } from "@/components/biblioteca/star-input";
import { field, FieldError, keepValuesOnSubmit } from "../../corrida/[slug]/claim-form";
import { RunDistanceField, RunTimeField, VirtualField } from "../add-run-form";
import { removeRun, saveRun, type RunLogState } from "../actions";

export type RunValues = {
  distanceKm: string;
  finishTime: string;
  comment: string;
  virtual: boolean;
} & Record<"rating" | (typeof CRITERIA)[number]["key"], number | null>;

/**
 * Distância, tempo e avaliação de uma corrida da estante. `publicReview`: a avaliação aparece na página da prova.
 * `opensOn`: prova que ainda não aconteceu; só dá para mudar a distância e se é virtual, e a avaliação abre nesse dia.
 */
export function EditRunForm({
  id,
  initial,
  distances,
  publicReview,
  authorName,
  opensOn,
}: {
  id: string;
  initial: RunValues;
  distances: { km: number; label: string }[];
  publicReview: boolean;
  authorName: string;
  opensOn?: string;
}) {
  const [state, action, pending] = useActionState<RunLogState, FormData>(saveRun.bind(null, id), null);
  const errors = state?.errors ?? {};
  const v = state?.values;
  const num = (s: string | undefined, fallback: number | null) => (s === undefined ? fallback : s ? Number(s) : null);
  const [comment, setComment] = useState(v?.comment ?? initial.comment);
  const virtual = v ? v.virtual === "on" : initial.virtual;

  if (opensOn) {
    return (
      <form onSubmit={(e) => keepValuesOnSubmit(e, action)} className="space-y-5">
        {state?.ok && <p className="rounded-lg bg-pace-500/20 p-3 text-sm font-semibold">Salvo.</p>}
        {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <p className="rounded-xl bg-asfalto-50 p-4 text-sm text-asfalto-700 ring-1 ring-asfalto-100">
          <strong className="block font-display text-lg text-asfalto-950 uppercase">Boa prova!</strong>
          A avaliação e o seu tempo abrem em {opensOn}, no dia da prova. Até lá, ela fica em “Próximas largadas”.
        </p>
        <div className="max-w-xs">
          <RunDistanceField distances={distances} defaultValue={v?.distanceKm ?? initial.distanceKm} error={errors.distanceKm?.[0]} />
        </div>
        <VirtualField defaultChecked={virtual} />
        <button disabled={pending} className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => keepValuesOnSubmit(e, action)} className="space-y-6">
      {state?.ok && <p className="rounded-lg bg-pace-500/20 p-3 text-sm font-semibold">Avaliação salva.</p>}
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <RunDistanceField distances={distances} defaultValue={v?.distanceKm ?? initial.distanceKm} error={errors.distanceKm?.[0]} />
        <RunTimeField defaultValue={v?.finishTime ?? initial.finishTime} error={errors.finishTime?.[0]} />
        <div className="sm:col-span-2">
          <VirtualField defaultChecked={virtual} />
        </div>
      </div>

      <div className="space-y-1">
        <StarInput name="rating" label="Sua nota para a prova" defaultValue={num(v?.rating, initial.rating)} size="h-10 w-10" />
        <FieldError msg={errors.rating?.[0]} />
      </div>

      <div>
        <p className="text-sm font-semibold">Detalhes (opcional)</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <div key={c.key}>
              <StarInput name={c.key} label={c.label} defaultValue={num(v?.[c.key], initial[c.key])} optional size="h-6 w-6" />
              <FieldError msg={errors[c.key]?.[0]} />
            </div>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-asfalto-700">Comentário (opcional)</span>
        <textarea
          name="comment"
          rows={5}
          maxLength={COMMENT_MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Como foi o percurso, a largada, a entrega do kit, a hidratação…"
          className={field}
        />
        <span className="flex justify-between gap-3 text-xs text-asfalto-500">
          <span>
            {publicReview
              ? `Sua nota e o comentário aparecem na página da prova como “${authorName}”.`
              : "Prova fora do calendário: a avaliação fica só na sua estante."}
          </span>
          <span className="tabular-nums">
            {comment.length}/{COMMENT_MAX}
          </span>
        </span>
        <FieldError msg={errors.comment?.[0]} />
      </label>

      <button disabled={pending} className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
        {pending ? "Salvando…" : "Salvar avaliação"}
      </button>
    </form>
  );
}

/** Tirar da estante pede um segundo clique, para não apagar a avaliação sem querer. */
export function RemoveRunButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-asfalto-500 underline hover:text-red-700">
        Tirar da estante
      </button>
    );
  }
  return (
    <form action={removeRun.bind(null, id)} className="flex flex-wrap items-center gap-3 text-sm">
      <span>A avaliação também sai da página da prova. Os pontos não mudam.</span>
      <button className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700">Tirar</button>
      <button type="button" onClick={() => setConfirming(false)} className="text-asfalto-500 underline">
        Cancelar
      </button>
    </form>
  );
}
