"use client";

import { useActionState } from "react";
import { raceTypeLabels, registrationStatusLabels, UFS } from "@/config/corridas";
import type { FormState } from "./actions";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2 text-sm";

export type RaceFormValues = Record<string, string>;

export function RaceAdminForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  initial: RaceFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? initial;
  const v = (k: string) => values[k] ?? "";

  return (
    <form key={JSON.stringify(values)} action={formAction} className="space-y-5">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Revise os campos destacados.
        </p>
      )}

      <Group title="Prova">
        <F label="Nome" error={errors.name}>
          <input name="name" defaultValue={v("name")} className={field} required />
        </F>
        <div className="grid gap-3 sm:grid-cols-3">
          <F label="Data" error={errors.date}>
            <input type="date" name="date" defaultValue={v("date")} className={field} required />
          </F>
          <F label="Largada" error={errors.time}>
            <input type="time" name="time" defaultValue={v("time") || "07:00"} className={field} required />
          </F>
          <F label="Tipo" error={errors.type}>
            <select name="type" defaultValue={v("type") || "RUA"} className={field}>
              {Object.entries(raceTypeLabels).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </F>
        </div>
        <F label="Distâncias em km, separadas por espaço" error={errors.distances} hint="Ex.: 5 10 21.1 42.195">
          <input name="distances" defaultValue={v("distances")} className={field} required />
        </F>
        <F label="Descrição" error={errors.description} hint="Escreva com suas palavras; não copie o texto de outros sites.">
          <textarea name="description" rows={6} defaultValue={v("description")} className={field} />
        </F>
        <F label="Imagem (URL)" error={errors.imageUrl} hint="Só use imagens com autorização do organizador.">
          <input name="imageUrl" defaultValue={v("imageUrl")} className={field} />
        </F>
        <F label="Slug (opcional)" error={errors.slug} hint="Deixe vazio para gerar a partir do nome e do ano.">
          <input name="slug" defaultValue={v("slug")} className={field} />
        </F>
      </Group>

      <Group title="Local">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <F label="Cidade" error={errors.city}>
            <input name="city" defaultValue={v("city")} className={field} required />
          </F>
          <F label="UF" error={errors.state}>
            <select name="state" defaultValue={v("state")} className={field}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </select>
          </F>
        </div>
        <F label="Local de largada" error={errors.venue}>
          <input name="venue" defaultValue={v("venue")} className={field} required />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Latitude" error={errors.lat} hint="Vazio = buscar automaticamente">
            <input name="lat" inputMode="decimal" defaultValue={v("lat")} className={field} />
          </F>
          <F label="Longitude" error={errors.lng}>
            <input name="lng" inputMode="decimal" defaultValue={v("lng")} className={field} />
          </F>
        </div>
      </Group>

      <Group title="Inscrições">
        <F label="Link oficial de inscrição" error={errors.registrationUrl} hint="Os parâmetros de parceria são adicionados automaticamente no clique.">
          <input name="registrationUrl" defaultValue={v("registrationUrl")} className={field} required />
        </F>
        <div className="grid gap-3 sm:grid-cols-4">
          <F label="Preço mín. (R$)" error={errors.priceMin}>
            <input name="priceMin" inputMode="decimal" defaultValue={v("priceMin") || "0"} className={field} />
          </F>
          <F label="Preço máx. (R$)" error={errors.priceMax}>
            <input name="priceMax" inputMode="decimal" defaultValue={v("priceMax") || "0"} className={field} />
          </F>
          <F label="Status" error={errors.registrationStatus}>
            <select name="registrationStatus" defaultValue={v("registrationStatus") || "ABERTAS"} className={field}>
              {Object.entries(registrationStatusLabels).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </F>
          <F label="Abertura" error={errors.registrationOpensAt}>
            <input type="date" name="registrationOpensAt" defaultValue={v("registrationOpensAt")} className={field} />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Organizador" error={errors.organizer}>
            <input name="organizer" defaultValue={v("organizer")} className={field} required />
          </F>
          <F label="E-mail do organizador" error={errors.organizerEmail}>
            <input name="organizerEmail" type="email" defaultValue={v("organizerEmail")} className={field} />
          </F>
        </div>
        <F label="Página de origem" error={errors.sourceUrl}>
          <input name="sourceUrl" defaultValue={v("sourceUrl")} className={field} />
        </F>
      </Group>

      <Group title="Parceria e destaque">
        <div className="grid grid-cols-2 gap-3">
          <F label="Cupom" error={errors.couponCode}>
            <input name="couponCode" defaultValue={v("couponCode")} placeholder="LARGADIA10" className={`${field} font-mono uppercase`} />
          </F>
          <F label="Texto do desconto" error={errors.couponLabel}>
            <input name="couponLabel" defaultValue={v("couponLabel")} placeholder="10% off" className={field} />
          </F>
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={v("featured") === "on"} /> Destaque na home
          </label>
          <F label="Ordem do destaque" error={errors.featuredOrder}>
            <input name="featuredOrder" inputMode="numeric" defaultValue={v("featuredOrder")} className={`${field} w-24`} />
          </F>
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        <select name="moderationStatus" defaultValue={v("moderationStatus") || "APROVADA"} className={`${field} w-auto`} aria-label="Situação">
          <option value="APROVADA">Publicada</option>
          <option value="PENDENTE">Pendente</option>
          <option value="RECUSADA">Recusada</option>
        </select>
        <button disabled={pending} className="rounded-xl bg-largada-500 px-6 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
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
