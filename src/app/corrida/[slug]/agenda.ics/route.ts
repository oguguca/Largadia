import { getRaceBySlug } from "@/domain/corridas/queries";
import { raceIcs } from "@/domain/corridas/links";
import { siteUrl } from "@/lib/site";

export async function GET(_request: Request, ctx: RouteContext<"/corrida/[slug]/agenda.ics">) {
  const { slug } = await ctx.params;
  const race = await getRaceBySlug(slug);
  if (!race) return new Response("Corrida não encontrada", { status: 404 });
  return new Response(raceIcs(race, siteUrl, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${race.slug}.ics"`,
    },
  });
}
