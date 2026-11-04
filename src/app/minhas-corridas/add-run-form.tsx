"use client";

import { useActionState, useMemo, useState } from "react";
import { UFS } from "@/config/corridas";
import { OTHER_RACE } from "@/domain/pontos/pontos";
import { field, FieldError, keepValuesOnSubmit } from "../corrida/[slug]/claim-form";
import { addRun, type RunLogState } from "./actions";

export type ShelfOption = {
  id: string;
  label: string;
  distances: { km: number; label: string }[];
  /** Prova que ainda vai acontecer: entra sem tempo e é avaliada depois */
  upcoming: boolean;
};

const label = "text-xs font-semibold text-asfalto-700";
const hint = "block text-xs text-asfalto-500";

/** Distância: as da prova, quando cadastradas; senão a pessoa digita. Vazio vale. */
export function RunDistanceField({
  distances,
  defaultValue,
  error,
}: {
  distances: { km: number; label: string }[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className={label}>Distância que você correu</span>
      {distances.length ? (
        <select name="distanceKm" defaultValue={defaultValue ?? ""} className={field}>
          <option value="">Não lembro</option>
          {distances.map((d) => (
            <option key={d.km} value={d.km}>
              {d.label}
            </option>
          ))}
        </select>
      ) : (
        <input name="distanceKm" type="number" step="0.001" min={0.5} max={300} inputMode="decimal" placeholder="Ex.: 10" defaultValue={defaultValue} className={field} />
      )}
      <FieldError msg={error} />
    </label>
  );
}

/** "Corrida virtual": a pessoa corre a distância onde quiser, sem largada no local. */
export function VirtualField({ defaultChecked, onChange }: { defaultChecked?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name="virtual"
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-largada-500"
      />
      <span>
        <span className="font-semibold">Corrida virtual</span>
        <span className="block text-xs text-asfalto-500">Você corre a distância onde quiser, sem largada no local.</span>
      </span>
    </label>
  );
}

export function RunTimeField({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  return (
    <label className="block space-y-1">
      <span className={label}>Seu tempo (opcional)</span>
      <input name="finishTime" placeholder="h:mm:ss ou mm:ss" inputMode="numeric" defaultValue={defaultValue} className={field} />
      <FieldError msg={error} />
    </label>
  );
}

/**
 * Põe uma corrida na estante: já corrida ou que a pessoa ainda vai correr. A prova vem do calendário ou,
 * se não estiver nele, a pessoa informa nome, data e local. `today` e `maxDate` são dias (aaaa-mm-dd).
 * Depois de salvar, abre a tela da corrida (avaliação, quando a prova já aconteceu).
 */
export function AddRunForm({ races, today, maxDate }: { races: ShelfOption[]; today: string; maxDate: string }) {
  const [state, action, pending] = useActionState<RunLogState, FormData>(addRun, null);
  const [raceId, setRaceId] = useState(races.length ? "" : OTHER_RACE);
  const [query, setQuery] = useState("");
  const race = races.find((r) => r.id === raceId);
  const custom = raceId === OTHER_RACE;
  const errors = state?.errors ?? {};
  const values = state?.values;
  const [virtual, setVirtual] = useState(values?.virtual === "on");
  const [customDate, setCustomDate] = useState(values?.customRaceDate ?? "");
  // Prova futura não tem tempo ainda: o campo some
  const upcoming = custom ? !!customDate && customDate > today : !!race?.upcoming;

  // Busca sem acento e sem caixa, para achar a prova no meio de centenas
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return q ? races.filter((r) => fold(r.label).includes(q)) : races;
  }, [races, query]);

  return (
    <form onSubmit={(e) => keepValuesOnSubmit(e, action)} className="grid gap-3 sm:grid-cols-2">
      {state?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {races.length > 0 && (
        <label className="block space-y-1 sm:col-span-2">
          <span className={label}>Procurar a prova</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, cidade ou UF"
            className={field}
          />
        </label>
      )}
      <label className="block space-y-1 sm:col-span-2">
        <span className={label}>Prova que você correu</span>
        <select name="raceId" required value={raceId} onChange={(e) => setRaceId(e.target.value)} className={field}>
          <option value="" disabled>
            {shown.length ? `Escolha a prova (${shown.length})` : "Nenhuma prova encontrada"}
          </option>
          {[
            { label: "Próximas provas", items: shown.filter((r) => r.upcoming) },
            { label: "Já aconteceram", items: shown.filter((r) => !r.upcoming) },
          ].map(
            (g) =>
              g.items.length > 0 && (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ),
          )}
          {/* A escolhida continua na lista mesmo quando a busca muda */}
          {race && !shown.includes(race) && <option value={race.id}>{race.label}</option>}
          <option value={OTHER_RACE}>Minha prova não está na lista</option>
        </select>
        <span className={hint}>Vale prova que você já correu ou que ainda vai correr: a avaliação abre no dia dela.</span>
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
            <input
              name="customRaceDate"
              type="date"
              required
              min="1970-01-01"
              max={maxDate}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={field}
            />
            <FieldError msg={errors.customRaceDate?.[0]} />
          </label>
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <label className="block space-y-1">
              <span className={label}>Cidade</span>
              <input name="customCity" required={!virtual} minLength={2} maxLength={80} defaultValue={values?.customCity} className={field} />
              <FieldError msg={errors.customCity?.[0]} />
            </label>
            <label className="block space-y-1">
              <span className={label}>UF</span>
              <select name="customState" required={!virtual} defaultValue={values?.customState ?? ""} className={field}>
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
        <RunDistanceField distances={race?.distances ?? []} defaultValue={values?.distanceKm} error={errors.distanceKm?.[0]} />
      </div>
      {upcoming ? (
        <p className="self-end pb-2 text-sm text-asfalto-500">Prova futura: o tempo e a nota você coloca depois de correr.</p>
      ) : (
        <RunTimeField defaultValue={values?.finishTime} error={errors.finishTime?.[0]} />
      )}
      <div className="sm:col-span-2">
        <VirtualField defaultChecked={virtual} onChange={setVirtual} />
      </div>

      <div className="sm:col-span-2">
        <button
          disabled={pending || !raceId}
          className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60"
        >
          {pending ? "Adicionando…" : upcoming ? "Adicionar às próximas" : "Adicionar e avaliar"}
        </button>
      </div>
    </form>
  );
}
