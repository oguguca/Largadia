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
