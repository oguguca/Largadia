"use client";

import { useActionState } from "react";
import { participar, type EntryState } from "./actions";

export function EntryButton({ raffleId, entered }: { raffleId: string; entered: boolean }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(participar.bind(null, raffleId), null);
  if (entered || state?.ok) return <p className="font-semibold text-pace-600">✓ Você está participando</p>;
  return (
    <form action={action} className="space-y-1">
      <button disabled={pending} className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60">
        {pending ? "Enviando…" : "Participar"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
