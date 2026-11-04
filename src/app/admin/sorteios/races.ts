import "server-only";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/format";

/** Provas publicadas e futuras para ligar ao prêmio, mais a já ligada (mesmo que tenha passado). */
export async function raceOptions(currentId?: string | null) {
  const races = await db.race.findMany({
    where: { OR: [{ moderationStatus: "APROVADA", startsAt: { gte: new Date() } }, ...(currentId ? [{ id: currentId }] : [])] },
    orderBy: { startsAt: "asc" },
    take: 300,
    select: { id: true, name: true, startsAt: true, city: true, state: true },
  });
  return races.map((r) => ({ id: r.id, label: `${formatDateShort(r.startsAt)} · ${r.name} (${r.city}/${r.state})` }));
}
