"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { reviewsTag } from "@/domain/biblioteca/salvar";

/** Esconde (ou volta a mostrar) uma avaliação na página da prova. Ela continua na estante de quem escreveu. */
export async function setReviewHidden(id: string, hidden: boolean) {
  await requireAdmin();
  const log = await db.runLog.update({
    where: { id: z.string().cuid().parse(id) },
    data: { hiddenAt: hidden ? new Date() : null },
    select: { raceId: true },
  });
  if (log.raceId) updateTag(reviewsTag(log.raceId));
  revalidatePath("/admin/avaliacoes");
}
