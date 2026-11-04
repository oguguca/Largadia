import "server-only";
import { cache } from "react";
import { currentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { isPremium } from "@/domain/assinatura/status";

/** Quem está vendo a página e em quais dos sorteios listados já entrou. */
export async function raffleViewer(raffleIds: string[]) {
  const session = await currentSession();
  const userId = session?.user?.id;
  if (!userId) return { viewer: "visitante" as const, entered: new Set<string>() };
  const [user, entries] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { subscriptionStatus: true, subscriptionEndsAt: true } }),
    db.raffleEntry.findMany({ where: { userId, raffleId: { in: raffleIds } }, select: { raffleId: true } }),
  ]);
  if (!user) return { viewer: "visitante" as const, entered: new Set<string>() };
  return { viewer: isPremium(user) ? ("premium" as const) : ("usuario" as const), entered: new Set(entries.map((e) => e.raffleId)) };
}

/** Quantos assinantes Premium estão ativos agora (mesma regra de acesso do resto do site). */
export const countActiveSubscribers = cache(async (): Promise<number> => {
  const users = await db.user.findMany({
    where: { subscriptionStatus: { not: null } },
    select: { subscriptionStatus: true, subscriptionEndsAt: true },
  });
  return users.filter((u) => isPremium(u)).length;
});

/**
 * Sorteios abertos e ainda no prazo (ou sem prazo), os que fecham primeiro antes.
 * Cada um vem com o número de assinantes ativos, para a barra da meta (quando houver).
 */
export async function getOpenRaffles(take?: number) {
  const [raffles, activeSubscribers] = await Promise.all([findOpenRaffles(take), countActiveSubscribers()]);
  return raffles.map((r) => ({ ...r, activeSubscribers }));
}

function findOpenRaffles(take?: number) {
  return db.raffle.findMany({
    where: { status: "ABERTO", OR: [{ entriesCloseAt: null }, { entriesCloseAt: { gt: new Date() } }] },
    // Os com prazo vêm primeiro (fecham antes); os sem data, depois
    orderBy: { entriesCloseAt: { sort: "asc", nulls: "last" } },
    take,
    select: {
      id: true,
      title: true,
      prize: true,
      description: true,
      imageUrl: true,
      entriesCloseAt: true,
      premiumOnly: true,
      drawAtSubscribers: true,
      race: { select: { name: true, slug: true } },
      _count: { select: { entries: true } },
    },
  });
}
