import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateBrt } from "@/lib/dates";
import { customRaceSchema, OTHER_RACE } from "@/domain/pontos/pontos";
import { hasStarted, runLogData, runLogSchema } from "./biblioteca";

export type RunLogState = {
  ok?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
  /** Corrida criada ou já existente na estante */
  id?: string;
} | null;

/** Etiqueta do cache das avaliações de uma prova: salvar ou esconder uma avaliação atualiza a página dela. */
export const reviewsTag = (raceId: string) => `avaliacoes:${raceId}`;

function fieldErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) (errors[String(issue.path[0])] ??= []).push(issue.message);
  return errors;
}

/** Distância fora das da prova costuma ser engano; prova sem distâncias cadastradas aceita o que vier. */
function distanceError(distances: number[], km: number | undefined) {
  return km !== undefined && distances.length && !distances.includes(km) ? { distanceKm: ["Escolha uma das distâncias da prova."] } : null;
}

/**
 * Põe uma corrida na estante. A prova pode ser do calendário (raceId) ou informada à mão (raceId = "outra").
 * Só entra prova que já aconteceu. Se ela já estiver na estante, devolve a que existe.
 */
export async function addRunLog(userId: string, raceId: string, form: FormData): Promise<NonNullable<RunLogState> & { raceId?: string }> {
  const values = Object.fromEntries(form.entries());
  const parsed = runLogSchema.safeParse(values);

  if (raceId === OTHER_RACE) {
    const custom = customRaceSchema.safeParse(values);
    if (!parsed.success || !custom.success) {
      return { errors: { ...(parsed.success ? {} : fieldErrors(parsed.error.issues)), ...(custom.success ? {} : fieldErrors(custom.error.issues)) } };
    }
    const day = parseDateBrt(custom.data.customRaceDate);
    if (!day || day.getUTCFullYear() < 1970) return { errors: { customRaceDate: ["Data inválida."] } };
    if (!hasStarted(day)) return { errors: { customRaceDate: ["Só entram corridas que já aconteceram."] } };
    const duplicate = await db.runLog.findFirst({
      where: { userId, raceId: null, raceDate: day, customRaceName: { equals: custom.data.customRaceName, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return { ok: true, id: duplicate.id };
    const log = await db.runLog.create({
      data: {
        userId,
        raceDate: day,
        customRaceName: custom.data.customRaceName,
        customCity: custom.data.customCity,
        customState: custom.data.customState,
        ...runLogData(parsed.data),
      },
      select: { id: true },
    });
    return { ok: true, id: log.id };
  }

  const id = z.string().cuid().safeParse(raceId);
  if (!id.success) return { errors: { raceId: ["Escolha a prova que você correu."] } };
  const race = await db.race.findFirst({
    where: { id: id.data, moderationStatus: "APROVADA" },
    select: { id: true, startsAt: true, distancesKm: true },
  });
  if (!race) return { errors: { raceId: ["Prova não encontrada."] } };
  if (!hasStarted(race.startsAt)) return { error: "Esta prova ainda não aconteceu." };
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  const wrongDistance = distanceError(race.distancesKm, parsed.data.distanceKm);
  if (wrongDistance) return { errors: wrongDistance };

  const existing = await db.runLog.findUnique({ where: { userId_raceId: { userId, raceId: race.id } }, select: { id: true } });
  if (existing) return { ok: true, id: existing.id, raceId: race.id };
  const log = await db.runLog.create({
    data: { userId, raceId: race.id, raceDate: race.startsAt, ...runLogData(parsed.data) },
    select: { id: true },
  });
  return { ok: true, id: log.id, raceId: race.id };
}

/** Atualiza distância, tempo e avaliação de uma corrida da estante da pessoa. */
export async function updateRunLog(userId: string, logId: string, form: FormData): Promise<NonNullable<RunLogState> & { raceId?: string | null }> {
  const id = z.string().cuid().safeParse(logId);
  if (!id.success) return { error: "Corrida não encontrada." };
  const log = await db.runLog.findFirst({
    where: { id: id.data, userId },
    select: { id: true, raceId: true, race: { select: { distancesKm: true } } },
  });
  if (!log) return { error: "Corrida não encontrada." };
  const parsed = runLogSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  const wrongDistance = distanceError(log.race?.distancesKm ?? [], parsed.data.distanceKm);
  if (wrongDistance) return { errors: wrongDistance };
  await db.runLog.update({ where: { id: log.id }, data: runLogData(parsed.data) });
  return { ok: true, id: log.id, raceId: log.raceId };
}

/** Tira a corrida da estante. Os pontos, se houver, não mudam. */
export async function deleteRunLog(userId: string, logId: string): Promise<{ raceId: string | null } | null> {
  const id = z.string().cuid().safeParse(logId);
  if (!id.success) return null;
  const log = await db.runLog.findFirst({ where: { id: id.data, userId }, select: { id: true, raceId: true } });
  if (!log) return null;
  await db.runLog.delete({ where: { id: log.id } });
  return { raceId: log.raceId };
}

/**
 * Comprovação aprovada nos pontos entra sozinha na estante, com distância e tempo.
 * Se a corrida já estava lá, só preenche o que faltava; a avaliação da pessoa não muda.
 */
export async function logApprovedClaim(claimId: string) {
  const c = await db.pointClaim.findUnique({ where: { id: claimId } });
  if (!c || c.status !== "APROVADA") return;
  const raceDate = c.raceDate ?? c.customRaceDate ?? c.createdAt;
  const existing = c.raceId
    ? await db.runLog.findUnique({ where: { userId_raceId: { userId: c.userId, raceId: c.raceId } } })
    : await db.runLog.findFirst({
        where: { userId: c.userId, raceId: null, raceDate, customRaceName: { equals: c.customRaceName ?? "", mode: "insensitive" } },
      });
  if (existing) {
    await db.runLog.update({
      where: { id: existing.id },
      data: { distanceKm: existing.distanceKm ?? c.distanceKm, finishSeconds: existing.finishSeconds ?? c.finishSeconds },
    });
    return;
  }
  await db.runLog.create({
    data: {
      userId: c.userId,
      raceId: c.raceId,
      customRaceName: c.raceId ? null : c.customRaceName,
      customCity: c.raceId ? null : c.customCity,
      customState: c.raceId ? null : c.customState,
      raceDate,
      distanceKm: c.distanceKm,
      finishSeconds: c.finishSeconds,
    },
  });
}
