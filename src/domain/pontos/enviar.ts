import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateBrt } from "@/lib/dates";
import { isPremium } from "@/domain/assinatura/status";
import { claimBlockReason, claimSchema, customRaceSchema, OTHER_RACE, pointsFor } from "./pontos";

export type ClaimState = {
  ok?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  /** O que a pessoa digitou, para o formulário não voltar em branco quando algo falha */
  values?: Record<string, string>;
} | null;

/** Campos de texto do formulário, devolvidos junto com o erro. */
export function formValues(form: FormData): Record<string, string> {
  return Object.fromEntries([...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string" && !e[0].startsWith("$")));
}

type Claimant = { id: string; subscriptionStatus: string | null; subscriptionEndsAt: Date | null };

/** Campos da comprovação comuns aos dois caminhos (prova do calendário ou informada). */
function claimData(c: z.infer<typeof claimSchema>, raceDate: Date) {
  return {
    raceDate,
    distanceKm: c.distanceKm,
    proofUrl: c.proofUrl,
    bibNumber: c.bibNumber,
    runnerName: c.runnerName,
    finishSeconds: c.finishTime,
    points: pointsFor(c.distanceKm),
  };
}

function fieldErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) (errors[String(issue.path[0])] ??= []).push(issue.message);
  return errors;
}

/**
 * Grava (ou reenvia, se foi recusada) a comprovação de uma prova para análise.
 * A prova pode ser do calendário (raceId) ou informada à mão (raceId = "outra").
 * Usada pela página da prova e pela Área Premium; os pontos só contam depois da aprovação.
 */
export async function saveClaim(user: Claimant, raceId: string, form: FormData): Promise<ClaimState & { slug?: string }> {
  if (raceId === OTHER_RACE) return saveCustomClaim(user, form);

  const id = z.string().cuid().safeParse(raceId);
  if (!id.success) return { errors: { raceId: ["Escolha a prova que você correu."] } };
  const race = await db.race.findFirst({
    where: { id: id.data, moderationStatus: "APROVADA" },
    select: { id: true, slug: true, startsAt: true, distancesKm: true },
  });
  if (!race) return { errors: { raceId: ["Prova não encontrada."] } };

  const parsed = claimSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  const blocked = claimBlockReason(race, { premium: isPremium(user) }, parsed.data);
  if (blocked) return { error: blocked };

  const existing = await db.pointClaim.findUnique({ where: { userId_raceId: { userId: user.id, raceId: race.id } }, select: { status: true } });
  if (existing && existing.status !== "RECUSADA") return { error: "Você já enviou a comprovação desta prova." };

  const data = claimData(parsed.data, race.startsAt);
  await db.pointClaim.upsert({
    where: { userId_raceId: { userId: user.id, raceId: race.id } },
    create: { ...data, userId: user.id, raceId: race.id },
    // Reenvio depois de recusa volta para análise
    update: { ...data, status: "PENDENTE", reviewNote: null, reviewedAt: null },
  });
  return { ok: true, slug: race.slug };
}

/** Prova que não está no calendário: o corredor informa nome, data e local, e a análise confere tudo. */
async function saveCustomClaim(user: Claimant, form: FormData): Promise<NonNullable<ClaimState>> {
  const values = Object.fromEntries(form.entries());
  const claim = claimSchema.safeParse(values);
  const custom = customRaceSchema.safeParse(values);
  if (!claim.success || !custom.success) {
    return { errors: { ...(claim.success ? {} : fieldErrors(claim.error.issues)), ...(custom.success ? {} : fieldErrors(custom.error.issues)) } };
  }
  const day = parseDateBrt(custom.data.customRaceDate);
  if (!day) return { errors: { customRaceDate: ["Data inválida."] } };
  // Mesmas regras de prazo e de distância de uma prova do calendário sem distâncias cadastradas
  const blocked = claimBlockReason({ startsAt: day, distancesKm: [] }, { premium: isPremium(user) }, claim.data);
  if (blocked) return { error: blocked };

  const duplicate = await db.pointClaim.findFirst({
    where: {
      userId: user.id,
      raceId: null,
      status: { not: "RECUSADA" },
      customRaceDate: day,
      customRaceName: { equals: custom.data.customRaceName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) return { error: "Você já enviou a comprovação desta prova." };

  await db.pointClaim.create({
    data: {
      userId: user.id,
      ...claimData(claim.data, day),
      customRaceName: custom.data.customRaceName,
      customRaceDate: day,
      customCity: custom.data.customCity,
      customState: custom.data.customState,
    },
  });
  return { ok: true };
}
