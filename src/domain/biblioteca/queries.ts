import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { publicName } from "@/domain/pontos/pontos";
import { summarizeRatings } from "./biblioteca";
import { reviewsTag } from "./salvar";

/** Quantos comentários a página da prova mostra. */
export const REVIEWS_SHOWN = 20;

/** Nota média, médias por critério e os comentários mais recentes de uma prova. */
export async function getRaceReviews(raceId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(raceId));
  const where = { raceId, rating: { not: null }, hiddenAt: null };
  const [ratings, comments] = await Promise.all([
    db.runLog.findMany({
      where,
      select: { rating: true, ratingCourse: true, ratingOrganization: true, ratingKit: true, ratingHydration: true },
    }),
    db.runLog.findMany({
      where: { ...where, comment: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: REVIEWS_SHOWN,
      select: { id: true, rating: true, comment: true, distanceKm: true, updatedAt: true, user: { select: { name: true } } },
    }),
  ]);
  return {
    ...summarizeRatings(ratings),
    comments: comments.map(({ user, ...c }) => ({ ...c, rating: c.rating!, comment: c.comment!, author: publicName(user.name) })),
  };
}
