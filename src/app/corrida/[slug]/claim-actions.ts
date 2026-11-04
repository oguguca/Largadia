"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formValues, saveClaim, type ClaimState } from "@/domain/pontos/enviar";

export type { ClaimState };

/** Envia (ou reenvia, se foi recusada) a comprovação de uma prova. Os pontos só contam depois da aprovação. */
export async function submitClaim(raceId: string, _prev: ClaimState, form: FormData): Promise<ClaimState> {
  const race = await db.race.findUnique({ where: { id: raceId }, select: { slug: true } }).catch(() => null);
  const user = await requireUser(race ? `/corrida/${race.slug}` : "/assinatura");
  const { slug, ...state } = await saveClaim(user, raceId, form);
  if (slug) {
    revalidatePath(`/corrida/${slug}`);
    revalidatePath("/assinatura");
  }
  return state.ok ? state : { ...state, values: formValues(form) };
}
