import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/** Quantidade de participantes de um sorteio aberto, consultada pelos cards a cada poucos segundos. */
export async function GET(_request: Request, ctx: RouteContext<"/api/sorteios/[id]/participantes">) {
  await connection();
  const id = z.string().cuid().safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "id inválido" }, { status: 400 });
  // Só sorteios visíveis no site; rascunhos não expõem nada
  const raffle = await db.raffle.findFirst({
    where: { id: id.data, status: { not: "RASCUNHO" } },
    select: { _count: { select: { entries: true } } },
  });
  if (!raffle) return Response.json({ error: "não encontrado" }, { status: 404 });
  return Response.json({ count: raffle._count.entries }, { headers: { "Cache-Control": "no-store" } });
}
