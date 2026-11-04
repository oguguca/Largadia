"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importBatch, type BatchState } from "../actions";

export function BatchImportForm() {
  const [state, action, pending] = useActionState<BatchState, FormData>(importBatch, null);
  const imported = state?.results?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3 rounded-2xl bg-asfalto-950 p-4 text-white">
        <textarea
          name="links"
          required
          rows={8}
          placeholder={"https://www.ticketsports.com.br/e/...\nhttps://www.ticketsports.com.br/e/..."}
          className="w-full rounded-lg bg-white px-3 py-2 font-mono text-sm text-asfalto-950"
        />
        <div className="flex items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-largada-500 px-4 py-2 font-semibold text-asfalto-950 disabled:opacity-60">
            {pending ? "Importando…" : "Importar"}
          </button>
          {pending && <span className="text-sm text-asfalto-300">Lendo uma página por vez, pode levar até um minuto.</span>}
        </div>
        {state?.error && <p className="text-sm text-largada-100">{state.error}</p>}
      </form>

      {state?.results && (
        <div className="space-y-2">
          <p className="text-sm">
            {imported} de {state.results.length} importada(s).{" "}
            {imported > 0 && (
              <Link href="/admin/corridas?status=PENDENTE" className="text-largada-600 hover:underline">
                Revisar pendentes
              </Link>
            )}
          </p>
          <ul className="divide-y divide-asfalto-100 overflow-hidden rounded-2xl bg-white text-sm ring-1 ring-asfalto-100">
            {state.results.map((r) => (
              <li key={r.url} className="flex flex-wrap items-baseline gap-2 p-3">
                <span className={r.ok ? "text-pace-500" : "text-largada-600"}>{r.ok ? "✓" : "✗"}</span>
                <div className="min-w-0 flex-1">
                  {r.id ? (
                    <Link href={`/admin/corridas/${r.id}`} className="font-medium hover:text-largada-600">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="break-all text-asfalto-500">{r.url}</span>
                  )}
                  <p className="text-xs text-asfalto-500">{r.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
