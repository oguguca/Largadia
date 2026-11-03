"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { draftFromPage, type FormState, type PageDraftState } from "../actions";
import { RaceAdminForm } from "../race-admin-form";
import { draftToFormValues } from "../draft-values";
import { BOOKMARKLET_PING, BOOKMARKLET_TYPE } from "../bookmarklet";

export function ReceiveAndForm({ save }: { save: (prev: FormState, form: FormData) => Promise<FormState> }) {
  const [state, setState] = useState<PageDraftState | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const opener = window.opener as Window | null;
    // Sem janela de origem não há o que esperar
    const timeout = setTimeout(() => setWaiting(false), opener ? 8000 : 0);
    if (!opener) return () => clearTimeout(timeout);
    let done = false;
    const onMessage = async (e: MessageEvent) => {
      if (done || e.source !== opener || e.data?.tipo !== BOOKMARKLET_TYPE) return;
      const { url, head, text, pdfs } = e.data;
      // A página só pode falar por ela mesma: o endereço informado precisa ser do site que mandou a mensagem
      let sameOrigin = false;
      try {
        sameOrigin = new URL(String(url)).origin === e.origin;
      } catch {}
      if (!sameOrigin) return;
      done = true;
      setState(await draftFromPage({ url, head, text, pdfs }));
      setWaiting(false);
    };
    window.addEventListener("message", onMessage);
    // Avisa a página da prova que pode mandar os dados (o ping não leva nada)
    opener.postMessage(BOOKMARKLET_PING, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, []);

  if (waiting) return <p className="text-asfalto-500">Recebendo os dados da página…</p>;
  if (!state) {
    return (
      <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
        Nenhuma página recebida. Abra a página da prova e clique no botão “Enviar ao Largadia”. Veja como instalar em{" "}
        <Link href="/admin/corridas/nova" className="underline">
          Nova corrida
        </Link>
        .
      </p>
    );
  }
  if (state.completed || state.alreadyComplete) return <Completed state={state} />;
  if (state.error || !state.draft) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;

  const initial = draftToFormValues(state.draft);
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-pace-500/20 p-3 text-sm">
        Recebido de{" "}
        <a href={state.draft.registrationUrl} target="_blank" rel="noreferrer" className="break-all underline">
          {state.draft.registrationUrl}
        </a>
        . Confira distâncias, preço e descrição antes de salvar.
        {state.warning && <span className="mt-1 block font-semibold text-largada-700">{state.warning}</span>}
      </p>
      <RaceAdminForm key={JSON.stringify(initial)} action={save} initial={initial} submitLabel="Salvar corrida" />
    </div>
  );
}

const km = (d: number) => `${d.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} km`;

/** Prova que já estava no site: mostra o que foi completado e leva para a próxima sem distância. */
function Completed({ state }: { state: PageDraftState }) {
  const race = state.completed ?? state.alreadyComplete!;
  const c = state.completed;
  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-asfalto-100">
      {c ? (
        <>
          <p className="font-display text-2xl font-bold uppercase">Prova atualizada</p>
          <p>
            <strong>{race.name}</strong> já estava no site e ganhou as distâncias {c.distances.map(km).join(", ")}.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-2xl font-bold uppercase">Nada para completar</p>
          <p>
            <strong>{race.name}</strong> já tem distância no site, ou a página não informa os km.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/corridas/sem-distancia" className="rounded-xl bg-asfalto-950 px-4 py-2 font-semibold text-white hover:bg-asfalto-800">
          Próxima sem distância
        </Link>
        <Link href={`/corrida/${race.slug}`} className="rounded-xl px-4 py-2 font-semibold ring-1 ring-asfalto-300 hover:bg-asfalto-50">
          Ver a prova no site
        </Link>
      </div>
      <p className="text-xs text-asfalto-500">Pode fechar esta janela e clicar no botão na página da próxima prova.</p>
    </div>
  );
}
