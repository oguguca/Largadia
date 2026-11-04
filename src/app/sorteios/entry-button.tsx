"use client";

import { useActionState } from "react";
import { participar, type EntryState } from "./actions";

export function EntryButton({ raffleId, entered }: { raffleId: string; entered: boolean }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(participar.bind(null, raffleId), null);
  if (entered || state?.ok) {
    return (
      <p className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-pace-500/25 px-4 text-sm font-semibold text-asfalto-950">
        <span aria-hidden>✓</span> Você está participando
      </p>
    );
  }
  return (
    <form action={action} className="space-y-1">
      <button disabled={pending} className="h-11 rounded-xl bg-largada-500 px-5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
        {pending ? "Enviando…" : "Participar"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
