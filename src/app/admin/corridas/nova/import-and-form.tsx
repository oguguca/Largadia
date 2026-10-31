"use client";

import { useActionState } from "react";
import { importFromUrl, type FormState, type ImportState } from "../actions";
import { RaceAdminForm, type RaceFormValues } from "../race-admin-form";

export function ImportAndForm({ save }: { save: (prev: FormState, form: FormData) => Promise<FormState> }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importFromUrl, null);
  const d = state?.draft;
  const initial: RaceFormValues = d
    ? {
        name: d.name ?? "",
        date: d.date ?? "",
        time: d.time ?? "",
        city: d.city ?? "",
        state: d.state ?? "",
        venue: d.venue ?? "",
        distances: d.distances?.join(" ") ?? "",
        description: d.description ?? "",
        organizer: d.organizer ?? "",
        registrationUrl: d.registrationUrl,
        sourceUrl: d.registrationUrl,
      }
    : {};

  return (
    <div className="space-y-6">
      <form action={action} className="rounded-2xl bg-asfalto-950 p-4 text-white">
        <label className="block space-y-2">
          <span className="font-display text-lg font-bold uppercase">Cadastro rápido</span>
          <span className="block text-sm text-asfalto-300">
            Cole o link da prova na plataforma de inscrição ou no site oficial. Os campos são pré-preenchidos para você revisar.
          </span>
          <div className="flex gap-2">
            <input
              name="url"
              type="url"
              required
              placeholder="https://www.ticketsports.com.br/e/..."
              className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-asfalto-950"
            />
            <button disabled={pending} className="rounded-lg bg-largada-500 px-4 font-semibold text-asfalto-950 disabled:opacity-60">
              {pending ? "Lendo…" : "Preencher"}
            </button>
          </div>
        </label>
        {state?.error && <p className="mt-2 text-sm text-largada-100">{state.error}</p>}
        {d && (
          <p className="mt-2 text-sm text-pace-500">
            Preenchido: {Object.entries(initial).filter(([, v]) => v).length} campos. Confira tudo antes de salvar.
            {d.imageSuggestion && (
              <>
                {" "}Imagem encontrada (use só com autorização):{" "}
                <a href={d.imageSuggestion} target="_blank" rel="noreferrer" className="underline">
                  abrir
                </a>
              </>
            )}
          </p>
        )}
      </form>

      <RaceAdminForm key={JSON.stringify(initial)} action={save} initial={initial} submitLabel="Salvar corrida" />
    </div>
  );
}
