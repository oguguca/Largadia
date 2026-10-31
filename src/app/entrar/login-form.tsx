"use client";

import { useActionState } from "react";
import { login } from "./actions";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2.5 text-base";

export function LoginForm({ voltar }: { voltar?: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="voltar" value={voltar ?? "/"} />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-medium">E-mail</span>
        <input name="email" type="email" autoComplete="email" required className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Senha</span>
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      <button
        disabled={pending}
        className="w-full rounded-xl bg-largada-500 px-4 py-3 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
