import "server-only";
import { db } from "@/lib/db";
import { isPremium } from "@/domain/assinatura/status";
import { publicName } from "./pontos";
import { rankTotals, type Season } from "./temporada";

export type RankingRow = { position: number; userId: string; name: string; points: number; races: number; km: number };

/**
 * Ranking de uma temporada: soma os pontos aprovados das provas que aconteceram nela.
 * Devolve o topo e a linha de quem está vendo, mesmo fora do topo.
 * Ninguém aparece com o nome: cada linha vira "Assinante N" pela ordem da tabela;
 * só quem está vendo enxerga o próprio nome na própria linha.
 */
export async function getPointsRanking(
  viewerId: string | null,
  season: Season,
  top = 20,
  /** Só a página de pagamento pede: mistura os corredores de demonstração (nunca em produção) */
  { demo = false }: { demo?: boolean } = {},
): Promise<{ rows: RankingRow[]; viewer: RankingRow | null }> {
  const [groups, subscribers] = await Promise.all([
    db.pointClaim.groupBy({
      by: ["userId"],
      where: { status: "APROVADA", raceDate: { gte: season.start, lt: season.end } },
      _sum: { points: true, distanceKm: true },
      _count: { _all: true },
    }),
    // Quem tem ou já teve assinatura; o filtro de Premium ativo é o mesmo usado no resto do site
    db.user.findMany({
      where: { subscriptionStatus: { not: null } },
      select: { id: true, subscriptionStatus: true, subscriptionEndsAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const scored = groups.map((g) => ({ userId: g.userId, points: g._sum.points ?? 0, races: g._count._all, km: g._sum.distanceKm ?? 0 }));
  const withPoints = new Set(scored.map((s) => s.userId));
  // Todo assinante ativo entra na tabela, mesmo sem corrida aprovada (pontos zerados)
  const zeroed = subscribers
    .filter((u) => !withPoints.has(u.id) && isPremium(u))
    .map((u) => ({ userId: u.id, points: 0, races: 0, km: 0 }));
  const ranked = rankTotals([...scored, ...zeroed, ...(demo ? demoTotals() : [])]);

  const viewerIndex = viewerId ? ranked.findIndex((r) => r.userId === viewerId) : -1;
  const viewerName =
    viewerIndex >= 0
      ? publicName((await db.user.findUnique({ where: { id: viewerId! }, select: { name: true } }))?.name ?? "Você")
      : null;
  const withName = (r: (typeof ranked)[number], i: number): RankingRow => ({
    ...r,
    name: i === viewerIndex && viewerName ? viewerName : `Assinante ${i + 1}`,
  });

  return {
    rows: ranked.slice(0, top).map(withName),
    viewer: viewerIndex >= 0 ? withName(ranked[viewerIndex], viewerIndex) : null,
  };
}

/**
 * Corredores de demonstração da tabela da página de pagamento, no computador local (`npm run dev`).
 * Nunca entram no site publicado: em produção a lista é vazia.
 * Pontos seguem a regra real: 5 por prova + 1 por km.
 */
function demoTotals() {
  if (process.env.NODE_ENV === "production") return [];
  return [
    { races: 4, km: 63 },
    { races: 3, km: 52 },
    { races: 3, km: 31 },
    { races: 2, km: 26 },
    { races: 1, km: 21 },
  ].map((d, i) => ({ userId: `demo-${i + 1}`, races: d.races, km: d.km, points: d.races * 5 + d.km }));
}

/** Campeão de uma temporada (ou null se ninguém pontuou). */
export async function getSeasonChampion(season: Season | null): Promise<RankingRow | null> {
  if (!season) return null;
  const { rows } = await getPointsRanking(null, season, 1);
  // Assinantes com pontos zerados entram na tabela, mas ninguém é campeão com 0 pontos
  return rows[0] && rows[0].points > 0 ? rows[0] : null;
}
