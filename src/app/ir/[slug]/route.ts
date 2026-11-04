import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformOf, trackedUrl } from "@/domain/corridas/links";

/**
 * Redireciona para a inscrição com os parâmetros do parceiro e registra o clique.
 * Ter a contagem aqui é o que dá números para negociar com as plataformas.
 */
export async function GET(_request: Request, ctx: RouteContext<"/ir/[slug]">) {
  const { slug } = await ctx.params;
  const race = await db.race.findFirst({
    where: { slug, moderationStatus: "APROVADA" },
    select: { id: true, registrationUrl: true },
  });
  // Só segue para links http(s); qualquer outro esquema gravado por engano volta para a busca
  if (!race || !/^https?:\/\//i.test(race.registrationUrl)) return NextResponse.redirect(new URL("/busca", _request.url));

  // Falha ao registrar o clique não pode impedir a pessoa de chegar na inscrição
  await db.raceClick
    .create({ data: { raceId: race.id, platform: platformOf(race.registrationUrl) } })
    .catch(() => undefined);

  const res = NextResponse.redirect(trackedUrl(race.registrationUrl), 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
