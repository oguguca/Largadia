"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { formValues } from "@/domain/pontos/enviar";
import { addRunLog, deleteRunLog, reviewsTag, setRunPhoto, updateRunLog, type RunLogState } from "@/domain/biblioteca/salvar";

export type { RunLogState };

const TOO_MANY = "Muitas alterações em pouco tempo. Tente de novo daqui a pouco.";

/** Estante e, quando a corrida é do calendário, as avaliações da página da prova. */
function refresh(raceId: string | null | undefined) {
  revalidatePath("/minhas-corridas");
  if (raceId) updateTag(reviewsTag(raceId));
}

/** Formulário "Adicionar corrida" da estante: a prova vem escolhida (ou informada) no próprio formulário. */
export async function addRun(_prev: RunLogState, form: FormData): Promise<RunLogState> {
  const user = await requireUser("/minhas-corridas");
  if (!(await rateLimit(`estante:${user.id}`, 60, 3600))) return { error: TOO_MANY, values: formValues(form) };
  const state = await addRunLog(user.id, String(form.get("raceId") ?? ""), form);
  if (!state.ok || !state.id) return { ...state, values: formValues(form) };
  refresh(state.raceId);
  redirect(`/minhas-corridas/${state.id}?nova=1`);
}

/** Botão da página da prova: põe a prova na estante e abre a avaliação. */
export async function addRaceToShelf(raceId: string, slug: string) {
  const user = await requireUser(`/corrida/${slug}`);
  if (!(await rateLimit(`estante:${user.id}`, 60, 3600))) redirect(`/corrida/${slug}`);
  const state = await addRunLog(user.id, raceId, new FormData());
  if (!state.ok || !state.id) redirect(`/corrida/${slug}`);
  refresh(state.raceId);
  redirect(`/minhas-corridas/${state.id}?nova=1`);
}

/** Salva distância, tempo e avaliação. */
export async function saveRun(logId: string, _prev: RunLogState, form: FormData): Promise<RunLogState> {
  const user = await requireUser(`/minhas-corridas/${logId}`);
  if (!(await rateLimit(`estante:${user.id}`, 60, 3600))) return { error: TOO_MANY, values: formValues(form) };
  const state = await updateRunLog(user.id, logId, form);
  if (!state.ok) return { ...state, values: formValues(form) };
  refresh(state.raceId);
  return { ok: true, id: state.id };
}

/** Envia a foto da capa. O botão "Tirar foto" manda o formulário sem arquivo. */
export async function saveRunPhoto(logId: string, _prev: { error?: string } | null, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser(`/minhas-corridas/${logId}`);
  const remove = form.get("remover") === "1";
  if (!remove && !(await rateLimit(`foto:${user.id}`, 30, 86_400))) return { error: TOO_MANY };
  const result = await setRunPhoto(user.id, logId, remove ? null : form.get("foto"));
  if (result.error) return result;
  revalidatePath("/minhas-corridas");
  revalidatePath(`/minhas-corridas/${logId}`);
  return { ok: true };
}

export async function removeRun(logId: string) {
  const user = await requireUser("/minhas-corridas");
  const removed = await deleteRunLog(user.id, logId);
  refresh(removed?.raceId);
  redirect("/minhas-corridas");
}
