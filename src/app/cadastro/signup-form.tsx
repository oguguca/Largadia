"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2.5 text-base";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, null);
  const errors = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      {errors.form && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errors.form[0]}
        </p>
      )}
      <Field label="Nome" error={errors.name}>
        <input name="name" autoComplete="name" defaultValue={state?.values?.name} required className={field} />
      </Field>
      <Field label="E-mail" error={errors.email}>
        <input name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} required className={field} />
      </Field>
      <Field label="Senha" error={errors.password}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={field} />
      </Field>
      <button
        disabled={pending}
        className="w-full rounded-xl bg-largada-500 px-4 py-3 font-semibold text-asfalto-950 hover:bg-largada-600 disabled:opacity-60"
      >
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error?.length ? <span className="block text-sm text-red-600">{error[0]}</span> : null}
    </label>
  );
}
