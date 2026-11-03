"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { flags } from "@/config/flags";
import { isPremium } from "@/domain/assinatura/status";
import { entryBlockReason } from "@/domain/sorteios/sorteio";

export type EntryState = { ok?: boolean; error?: string } | null;

/** Inscreve o corredor logado no sorteio. As regras são reconferidas aqui, não só na tela. */
export async function participar(raffleId: string): Promise<EntryState> {
  if (!flags.sorteiosAtivos) return { error: "Sorteios ainda não estão disponíveis." };
  const user = await requireUser("/assinatura");
  const raffle = await db.raffle.findUnique({ where: { id: z.string().cuid().parse(raffleId) } });
  if (!raffle) return { error: "Sorteio não encontrado." };
  // Último prêmio ganho, para a carência de quem ganhou recentemente
  const lastWin = await db.raffle.findFirst({
    where: { winnerId: user.id, drawnAt: { not: null } },
    orderBy: { drawnAt: "desc" },
    select: { drawnAt: true },
  });
  const blocked = entryBlockReason(raffle, { premium: isPremium(user), lastWinAt: lastWin?.drawnAt ?? null });
  if (blocked) return { error: blocked };
  // upsert: clicar duas vezes não cria participação duplicada
  await db.raffleEntry.upsert({
    where: { raffleId_userId: { raffleId: raffle.id, userId: user.id } },
    create: { raffleId: raffle.id, userId: user.id },
    update: {},
  });
  revalidatePath("/assinatura");
  revalidatePath("/");
  return { ok: true };
}
