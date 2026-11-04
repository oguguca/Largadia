import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateShort } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import { removeRace, setModeration } from "./actions";

const filtersSchema = z.object({
  status: z.enum(["PENDENTE", "APROVADA", "RECUSADA"]).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  realizadas: z.literal("1").optional().catch(undefined),
  salvo: z.string().max(140).optional().catch(undefined),
  excluida: z.literal("1").optional().catch(undefined),
});

const statusStyle = {
  PENDENTE: "bg-largada-100 text-largada-700",
  APROVADA: "bg-pace-500/30 text-asfalto-900",
  RECUSADA: "bg-asfalto-100 text-asfalto-500",
} as const;

export default async function AdminCorridasPage(props: PageProps<"/admin/corridas">) {
  await requireAdmin();
  const f = filtersSchema.parse(await props.searchParams);
  await connection();
  const now = new Date();

  const where: Prisma.RaceWhereInput = {
    ...(f.status ? { moderationStatus: f.status } : {}),
    startsAt: f.realizadas ? { lt: now } : f.status === "PENDENTE" ? undefined : { gte: now },
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: "insensitive" } },
            { city: { contains: f.q, mode: "insensitive" } },
            { organizer: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const races = await db.race.findMany({
    where,
    orderBy: { startsAt: f.realizadas ? "desc" : "asc" },
    take: 200,
    select: {
      id: true,
      slug: true,
      name: true,
      startsAt: true,
      city: true,
      state: true,
      moderationStatus: true,
      source: true,
      featured: true,
      couponCode: true,
      lat: true,
      moderationNote: true,
      _count: { select: { clicks: true } },
    },
  });

  const tab = (label: string, query: string, active: boolean) => (
    <Link
      href={`/admin/corridas${query}`}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      {f.salvo && <p className="rounded-lg bg-pace-500/20 p-3 text-sm">Corrida salva: {f.salvo}</p>}
      {f.excluida && <p className="rounded-lg bg-asfalto-100 p-3 text-sm">Corrida excluída.</p>}

      <div className="flex flex-wrap items-center gap-2">
        {tab("Próximas", "", !f.status && !f.realizadas)}
        {tab("Pendentes", "?status=PENDENTE", f.status === "PENDENTE")}
        {tab("Publicadas", "?status=APROVADA", f.status === "APROVADA" && !f.realizadas)}
        {tab("Realizadas", "?status=APROVADA&realizadas=1", !!f.realizadas)}
        {tab("Recusadas", "?status=RECUSADA", f.status === "RECUSADA")}
        <form className="ml-auto flex gap-2">
          {f.status && <input type="hidden" name="status" value={f.status} />}
          {f.realizadas && <input type="hidden" name="realizadas" value="1" />}
          <input name="q" defaultValue={f.q} placeholder="Buscar" className="rounded-lg border border-asfalto-300 px-3 py-1 text-sm" />
        </form>
      </div>

      <p className="text-sm text-asfalto-500">{races.length} corrida(s){races.length === 200 ? " — mostrando as 200 primeiras" : ""}</p>

      <ul className="divide-y divide-asfalto-100 overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100">
        {races.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-asfalto-700">{formatDateShort(r.startsAt)}</span>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/corridas/${r.id}`} className="font-medium hover:text-largada-600">
                {r.name}
              </Link>
              <p className="text-xs text-asfalto-500">
                {r.city}/{r.state} · {r.source === "ADMIN" ? "cadastro admin" : "enviada por organizador"} · {r._count.clicks} clique(s)
                {r.featured && " · ⭐ destaque"}
                {r.couponCode && ` · cupom ${r.couponCode}`}
                {r.lat === null && " · ⚠️ sem coordenadas"}
                {r.moderationNote && " · 📝 importada, revisar"}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[r.moderationStatus]}`}>
              {r.moderationStatus.toLowerCase()}
            </span>
            {r.moderationStatus === "PENDENTE" && (
              <div className="flex gap-1">
                <form action={setModeration.bind(null, r.id, "APROVADA")}>
                  <button className="rounded-lg bg-pace-500 px-2 py-1 text-xs font-semibold">Aprovar</button>
                </form>
                <form action={setModeration.bind(null, r.id, "RECUSADA")}>
                  <button className="rounded-lg px-2 py-1 text-xs ring-1 ring-asfalto-300">Recusar</button>
                </form>
              </div>
            )}
            {r.moderationStatus === "APROVADA" && (
              <Link href={`/corrida/${r.slug}`} target="_blank" className="text-xs text-largada-600 hover:underline">
                ver ↗
              </Link>
            )}
            <details className="group flex items-center">
              <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                <span className="group-open:hidden">Remover</span>
                <span className="hidden group-open:inline">Cancelar</span>
              </summary>
              <form action={removeRace.bind(null, r.id)} className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-red-700">Remover de vez?</span>
                <button className="rounded-lg bg-red-600 px-2 py-1 font-semibold text-white">Confirmar</button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
