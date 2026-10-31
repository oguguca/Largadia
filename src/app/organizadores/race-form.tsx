"use client";

import { useActionState } from "react";
import { raceTypeLabels, registrationStatusLabels, UFS } from "@/config/corridas";
import { submitRace, type SubmitState } from "./actions";

const COMMON_DISTANCES = [3, 5, 10, 15, 21.1, 42.195];
const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2.5 text-base sm:text-sm";

export function RaceForm() {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitRace, null);

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-pace-500/20 p-6 ring-1 ring-pace-600">
        <h2 className="font-display text-2xl font-bold uppercase">Corrida enviada! 🏁</h2>
        <p className="mt-1">
          Nossa equipe vai revisar as informações e publicar a prova em breve. Se precisarmos de algo, entraremos em contato pelo e-mail informado.
        </p>
      </div>
    );
  }

  const errors = state && !state.ok ? state.errors ?? {} : {};
  const values = (state && !state.ok ? state.values : undefined) ?? {};
  const v = (k: string) => (typeof values[k] === "string" ? (values[k] as string) : undefined);
  const checkedDistances = Array.isArray(values.distances) ? (values.distances as string[]).map(Number) : [];
  // Remonta o formulário com os valores enviados quando há erro, já que inputs não controlados não guardam estado
  const formKey = JSON.stringify(values);

  return (
    <form key={formKey} action={action} className="space-y-5" noValidate>
      {state && !state.ok && (state.message || Object.keys(errors).length > 0) && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.message ?? "Revise os campos destacados."}
        </p>
      )}

      <div className="hidden" aria-hidden>
        <label>
          Site <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Group title="A prova">
        <Field label="Nome da corrida" name="name" error={errors.name}>
          <input name="name" defaultValue={v("name")} className={field} required maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" name="date" error={errors.date}>
            <input type="date" name="date" defaultValue={v("date")} className={field} required />
          </Field>
          <Field label="Horário da largada" name="time" error={errors.time}>
            <input type="time" name="time" defaultValue={v("time") ?? "07:00"} className={field} required />
          </Field>
        </div>
        <Field label="Tipo" name="type" error={errors.type}>
          <select name="type" defaultValue={v("type") ?? "RUA"} className={field}>
            {Object.entries(raceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Distâncias</legend>
          <div className="flex flex-wrap gap-2">
            {COMMON_DISTANCES.map((d) => (
              <label key={d} className="cursor-pointer">
                <input type="checkbox" name="distances" value={d} defaultChecked={checkedDistances.includes(d)} className="peer sr-only" />
                <span className="inline-block rounded-full border border-asfalto-300 bg-white px-3 py-1.5 text-sm peer-checked:border-largada-500 peer-checked:bg-largada-500 peer-focus-visible:ring-2 peer-focus-visible:ring-largada-500">
                  {d === 21.1 ? "21k" : d === 42.195 ? "42k" : `${d}k`}
                </span>
              </label>
            ))}
            <input
              name="otherDistance"
              inputMode="decimal"
              placeholder="Outra (km)"
              defaultValue={v("otherDistance")}
              aria-label="Outra distância em km"
              className="w-28 rounded-full border border-asfalto-300 px-3 py-1.5 text-sm"
            />
          </div>
          <FieldError errors={errors.distances} />
        </fieldset>
        <Field label="Descrição" name="description" error={errors.description} hint="Percurso, kit, premiação, retirada do kit, regulamento…">
          <textarea name="description" rows={6} defaultValue={v("description")} className={field} maxLength={5000} />
        </Field>
        <Field label="Link de uma imagem (opcional)" name="imageUrl" error={errors.imageUrl}>
          <input type="url" name="imageUrl" defaultValue={v("imageUrl")} placeholder="https://" className={field} />
        </Field>
      </Group>

      <Group title="Local">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Cidade" name="city" error={errors.city}>
            <input name="city" defaultValue={v("city")} className={field} required />
          </Field>
          <Field label="UF" name="state" error={errors.state}>
            <select name="state" defaultValue={v("state") ?? ""} className={field}>
              <option value="" disabled>
                —
              </option>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Local de largada" name="venue" error={errors.venue} hint="Ex.: Parque Ibirapuera, Portão 3">
          <input name="venue" defaultValue={v("venue")} className={field} required />
        </Field>
      </Group>

      <Group title="Inscrições">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor mínimo (R$)" name="priceMin" error={errors.priceMin}>
            <input name="priceMin" inputMode="decimal" defaultValue={v("priceMin") ?? "0"} className={field} />
          </Field>
          <Field label="Valor máximo (R$)" name="priceMax" error={errors.priceMax}>
            <input name="priceMax" inputMode="decimal" defaultValue={v("priceMax")} className={field} />
          </Field>
        </div>
        <Field label="Link oficial de inscrição" name="registrationUrl" error={errors.registrationUrl}>
          <input type="url" name="registrationUrl" defaultValue={v("registrationUrl")} placeholder="https://" className={field} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" name="registrationStatus" error={errors.registrationStatus}>
            <select name="registrationStatus" defaultValue={v("registrationStatus") ?? "ABERTAS"} className={field}>
              {Object.entries(registrationStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Abertura (se em breve)" name="registrationOpensAt" error={errors.registrationOpensAt}>
            <input type="date" name="registrationOpensAt" defaultValue={v("registrationOpensAt")} className={field} />
          </Field>
        </div>
      </Group>

      <Group title="Organização">
        <Field label="Organizador" name="organizer" error={errors.organizer}>
          <input name="organizer" defaultValue={v("organizer")} className={field} required />
        </Field>
        <Field label="E-mail para contato" name="organizerEmail" error={errors.organizerEmail} hint="Não é exibido no site.">
          <input type="email" name="organizerEmail" defaultValue={v("organizerEmail")} className={field} required />
        </Field>
      </Group>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" defaultChecked={values.consent === "on"} />
        <span>
          Declaro que as informações são verdadeiras e que tenho autorização para divulgar esta prova.
          <FieldError errors={errors.consent} />
        </span>
      </label>

      <button
        disabled={pending}
        className="w-full rounded-xl bg-largada-500 px-4 py-3 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar para revisão"}
      </button>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-asfalto-100">
      <legend className="px-1 font-display text-lg font-bold uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1" data-field={name}>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{label}</span>
        {children}
      </label>
      {hint && !error && <p className="text-xs text-asfalto-500">{hint}</p>}
      <FieldError errors={error} />
    </div>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
