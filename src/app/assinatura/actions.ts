"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { formValues, saveClaim, type ClaimState } from "@/domain/pontos/enviar";

/** Registro de corrida feito pela Área Premium: a prova vem escolhida (ou informada) no próprio formulário. */
export async function registerRun(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const user = await requireUser("/assinatura");
  const { slug, ...state } = await saveClaim(user, String(form.get("raceId") ?? ""), form);
  if (state.ok) revalidatePath("/assinatura");
  if (slug) revalidatePath(`/corrida/${slug}`);
  return state.ok ? state : { ...state, values: formValues(form) };
}
