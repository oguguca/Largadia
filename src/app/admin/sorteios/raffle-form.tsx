"use client";

import { useActionState, useState } from "react";
import type { RaffleFormState } from "./actions";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2 text-sm";

export type RaffleFormValues = Record<string, string>;

export function RaffleForm({
  action,
  initial,
  races,
  submitLabel,
}: {
  action: (prev: RaffleFormState, form: FormData) => Promise<RaffleFormState>;
  initial: RaffleFormValues;
  races: { id: string; label: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? initial;
  const v = (k: string) => values[k] ?? "";
  const [manualClose, setManualClose] = useState(values.manualClose === "on");

  return (
    <form key={JSON.stringify(values)} action={formAction} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errors.form?.[0] ?? "Revise os campos destacados."}
        </p>
      )}
      <F label="Título" error={errors.title}>
        <input name="title" defaultValue={v("title")} placeholder="Sorteio de novembro" className={field} required />
      </F>
      <F label="Prêmio" error={errors.prize} hint="Qualquer prêmio: inscrição, tênis, suplemento, kit, relógio…">
        <input name="prize" defaultValue={v("prize")} placeholder="Tênis de corrida + kit de suplementos" className={field} required />
      </F>
      <F label="Descrição e regras" error={errors.description} hint="Como participar, prazo e como o ganhador será avisado.">
        <textarea name="description" rows={5} defaultValue={v("description")} className={field} required />
      </F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Prova ligada (só se o prêmio for inscrição)" error={errors.raceId}>
          <select name="raceId" defaultValue={v("raceId")} className={field}>
            <option value="">Nenhuma</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </F>
        <F label="Imagem do prêmio (URL, opcional)" error={errors.imageUrl}>
          <input name="imageUrl" defaultValue={v("imageUrl")} className={field} />
        </F>
      </div>
      <fieldset className="space-y-2 rounded-xl bg-asfalto-100/60 p-3">
        <legend className="px-1 text-xs font-semibold text-asfalto-700">Participações</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="manualClose" checked={manualClose} onChange={(e) => setManualClose(e.target.checked)} /> Sem data: eu
          encerro manualmente pelo painel
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <F label="Participações até" error={errors.closeDate}>
            <input type="date" name="closeDate" defaultValue={v("closeDate")} disabled={manualClose} className={`${field} disabled:opacity-40`} />
          </F>
          <F label="Horário" error={errors.closeTime}>
            <input type="time" name="closeTime" defaultValue={v("closeTime") || "23:59"} disabled={manualClose} className={`${field} disabled:opacity-40`} />
          </F>
          <F label="Situação" error={errors.status}>
            <select name="status" defaultValue={v("status") || "RASCUNHO"} className={field}>
              <option value="RASCUNHO">Rascunho (não aparece no site)</option>
              <option value="ABERTO">Aberto</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </F>
        </div>
      </fieldset>
      <F
        label="Meta de assinantes (opcional)"
        error={errors.drawAtSubscribers}
        hint="Ex.: 100. O cartão mostra “sorteado quando o Largadia bater 100 assinantes Premium” com a barra de progresso."
      >
        <input name="drawAtSubscribers" type="number" min={1} inputMode="numeric" defaultValue={v("drawAtSubscribers")} className={field} />
      </F>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="premiumOnly" defaultChecked={v("premiumOnly") !== ""} /> Só assinantes Premium podem participar
      </label>
      <button disabled={pending} className="rounded-xl bg-largada-500 px-6 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

function F({ label, error, hint, children }: { label: string; error?: string[]; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-asfalto-700">{label}</span>
        {children}
      </label>
      {error?.length ? <p className="text-xs text-red-600">{error[0]}</p> : hint ? <p className="text-xs text-asfalto-500">{hint}</p> : null}
    </div>
  );
}
