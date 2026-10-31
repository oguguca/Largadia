import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { addDays } from "@/lib/dates";

export default async function AdminPage() {
  await requireAdmin();
  await connection();
  const now = new Date();
  const since = addDays(now, -30);

  const [pending, upcoming, past, clicksByPlatform, topRaces] = await Promise.all([
    db.race.count({ where: { moderationStatus: "PENDENTE" } }),
    db.race.count({ where: { moderationStatus: "APROVADA", startsAt: { gte: now } } }),
    db.race.count({ where: { moderationStatus: "APROVADA", startsAt: { lt: now } } }),
    db.raceClick.groupBy({
      by: ["platform"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { platform: "desc" } },
    }),
    db.raceClick.groupBy({
      by: ["raceId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { raceId: "desc" } },
      take: 10,
    }),
  ]);
  const raceNames = await db.race.findMany({
    where: { id: { in: topRaces.map((r) => r.raceId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(raceNames.map((r) => [r.id, r.name]));
  const totalClicks = clicksByPlatform.reduce((s, p) => s + p._count._all, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Pendentes de revisão" value={pending} href="/admin/corridas?status=PENDENTE" highlight={pending > 0} />
        <Stat label="Próximas publicadas" value={upcoming} href="/admin/corridas?status=APROVADA" />
        <Stat label="Realizadas" value={past} href="/admin/corridas?status=APROVADA&realizadas=1" />
        <Stat label="Cliques em inscrição (30 dias)" value={totalClicks} />
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-xl font-bold uppercase">Cliques por plataforma</h2>
          <p className="mb-2 text-xs text-asfalto-500">Últimos 30 dias. Use estes números para negociar com as plataformas.</p>
          <Table rows={clicksByPlatform.map((p) => [p.platform, p._count._all])} empty="Nenhum clique ainda." />
        </div>
        <div>
          <h2 className="mb-2 font-display text-xl font-bold uppercase">Provas mais clicadas</h2>
          <p className="mb-2 text-xs text-asfalto-500">Últimos 30 dias.</p>
          <Table rows={topRaces.map((r) => [nameOf.get(r.raceId) ?? "—", r._count._all])} empty="Nenhum clique ainda." />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href, highlight }: { label: string; value: number; href?: string; highlight?: boolean }) {
  const body = (
    <div className={`rounded-2xl p-4 ring-1 ${highlight ? "bg-largada-100 ring-largada-500" : "bg-white ring-asfalto-100"}`}>
      <p className="font-display text-4xl font-extrabold">{value.toLocaleString("pt-BR")}</p>
      <p className="text-sm text-asfalto-500">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Table({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <p className="rounded-xl bg-white p-4 text-sm text-asfalto-500 ring-1 ring-asfalto-100">{empty}</p>;
  return (
    <table className="w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-asfalto-100">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-asfalto-100 last:border-0">
            <td className="p-2">{k}</td>
            <td className="p-2 text-right font-semibold tabular-nums">{v.toLocaleString("pt-BR")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
