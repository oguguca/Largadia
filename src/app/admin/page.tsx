import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { addDays } from "@/lib/dates";
import { formatDateShort } from "@/lib/format";
import { PREMIUM_PRICE_CENTS } from "@/config/assinatura";
import { fillDailySeries } from "@/domain/admin/metricas";
import { ClicksChart } from "./clicks-chart";

const DAYS = 30;
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function AdminPage() {
  const admin = await requireAdmin();
  await connection();
  const now = new Date();
  const since = addDays(now, -DAYS);

  const [pending, claimsPending, upcoming, past, runners, premium, clicksByPlatform, topRaces, dailyRows, latestPending] = await Promise.all([
    db.race.count({ where: { moderationStatus: "PENDENTE" } }),
    db.pointClaim.count({ where: { status: "PENDENTE" } }),
    db.race.count({ where: { moderationStatus: "APROVADA", startsAt: { gte: now } } }),
    db.race.count({ where: { moderationStatus: "APROVADA", startsAt: { lt: now } } }),
    db.user.count({ where: { role: "USER" } }),
    db.user.count({ where: { subscriptionStatus: { in: ["active", "trialing", "past_due"] } } }),
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
      take: 8,
    }),
    db.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM "RaceClick" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.race.findMany({
      where: { moderationStatus: "PENDENTE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, city: true, state: true, startsAt: true, moderationNote: true },
    }),
  ]);
  const raceNames = await db.race.findMany({ where: { id: { in: topRaces.map((r) => r.raceId) } }, select: { id: true, name: true } });
  const nameOf = new Map(raceNames.map((r) => [r.id, r.name]));
  const totalClicks = clicksByPlatform.reduce((s, p) => s + p._count._all, 0);
  const series = fillDailySeries(dailyRows, now, DAYS);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-asfalto-500">Olá, {admin.name.split(" ")[0]}</p>
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Painel</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Corridas pendentes" value={pending.toLocaleString("pt-BR")} href="/admin/corridas?status=PENDENTE" highlight={pending > 0} />
        <Stat label="Comprovações de pontos" value={claimsPending.toLocaleString("pt-BR")} href="/admin/pontos" highlight={claimsPending > 0} hint="para revisar" />
        <Stat label="Próximas publicadas" value={upcoming.toLocaleString("pt-BR")} href="/admin/corridas?status=APROVADA" hint={`${past} já realizadas`} />
        <Stat label={`Cliques em inscrição · ${DAYS} dias`} value={totalClicks.toLocaleString("pt-BR")} />
        <Stat
          label="Assinantes Premium"
          value={premium.toLocaleString("pt-BR")}
          hint={`${brl(premium * PREMIUM_PRICE_CENTS)}/mês · ${runners} corredor(es)`}
        />
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold uppercase">Cliques em inscrição por dia</h2>
          <p className="text-xs text-asfalto-500">Últimos {DAYS} dias, horário de Brasília</p>
        </div>
        <ClicksChart series={series} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100 lg:col-span-1">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold uppercase">Para revisar</h2>
            <Link href="/admin/corridas?status=PENDENTE" className="text-xs font-semibold text-largada-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {latestPending.length ? (
            <ul className="divide-y divide-asfalto-100 text-sm">
              {latestPending.map((r) => (
                <li key={r.id} className="py-2">
                  <Link href={`/admin/corridas/${r.id}`} className="font-medium hover:text-largada-600">
                    {r.name}
                  </Link>
                  <p className="text-xs text-asfalto-500">
                    {formatDateShort(r.startsAt)} · {r.city}/{r.state}
                    {r.moderationNote && " · 📝 importada"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-asfalto-500">Nada pendente. 🎉</p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
          <h2 className="mb-1 font-display text-xl font-bold uppercase">Cliques por plataforma</h2>
          <p className="mb-3 text-xs text-asfalto-500">Use estes números para negociar com as plataformas.</p>
          <Bars rows={clicksByPlatform.map((p) => [p.platform, p._count._all])} empty="Nenhum clique ainda." />
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
          <h2 className="mb-1 font-display text-xl font-bold uppercase">Provas mais clicadas</h2>
          <p className="mb-3 text-xs text-asfalto-500">Últimos {DAYS} dias.</p>
          <Bars rows={topRaces.map((r) => [nameOf.get(r.raceId) ?? "—", r._count._all])} empty="Nenhum clique ainda." />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href, highlight, hint }: { label: string; value: string; href?: string; highlight?: boolean; hint?: string }) {
  const body = (
    <div className={`h-full rounded-2xl p-4 ring-1 transition ${highlight ? "bg-largada-100 ring-largada-500" : "bg-white ring-asfalto-100"} ${href ? "hover:ring-largada-500" : ""}`}>
      <p className="text-xs font-semibold tracking-wide text-asfalto-500 uppercase">{label}</p>
      <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-asfalto-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Barras horizontais de uma série só: o comprimento é o valor, o texto fica na cor do texto. */
function Bars({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-asfalto-500">{empty}</p>;
  const max = Math.max(...rows.map(([, v]) => v));
  return (
    <ul className="space-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <li key={label} title={`${label}: ${value.toLocaleString("pt-BR")} clique(s)`}>
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate">{label}</span>
            <span className="font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-2 rounded-full bg-asfalto-100">
            <div className="h-2 rounded-full bg-largada-600" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
