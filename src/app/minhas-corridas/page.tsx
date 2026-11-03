import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, formatDistance } from "@/lib/format";
import { RaceVisual } from "@/components/corridas/race-visual";
import { Stars } from "@/components/biblioteca/stars";
import { brtDay, shelfStats } from "@/domain/biblioteca/biblioteca";
import { formatFinishTime } from "@/domain/pontos/pontos";
import type { RaceType } from "@/generated/prisma/enums";
import { AddRunForm, type ShelfOption } from "./add-run-form";

export const metadata: Metadata = { title: "Minhas corridas", robots: { index: false } };

export default function MinhasCorridasPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse px-4 py-10" />}>
      <Shelf />
    </Suspense>
  );
}

type ShelfItem = {
  id: string;
  name: string;
  date: Date;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  type: RaceType;
  distanceKm: number | null;
  finishSeconds: number | null;
  rating: number | null;
  points: number | null;
};

/** "10K", "21,1K": a distância como vem no número de peito. */
const shortKm = (km: number) => `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K`;

async function Shelf() {
  const user = await requireUser("/minhas-corridas");
  const now = new Date();
  const [logs, claims, past] = await Promise.all([
    db.runLog.findMany({
      where: { userId: user.id },
      orderBy: [{ raceDate: "desc" }, { createdAt: "desc" }],
      include: { race: { select: { name: true, city: true, state: true, imageUrl: true, type: true } } },
    }),
    db.pointClaim.findMany({ where: { userId: user.id, status: "APROVADA", raceId: { not: null } }, select: { raceId: true, points: true } }),
    // Provas do calendário que já aconteceram, para escolher no "Adicionar corrida"
    db.race.findMany({
      where: { moderationStatus: "APROVADA", startsAt: { lt: new Date(`${brtDay(now)}T23:59:59-03:00`) } },
      orderBy: { startsAt: "desc" },
      take: 1500,
      select: { id: true, name: true, city: true, state: true, startsAt: true, distancesKm: true },
    }),
  ]);

  const pointsByRace = new Map(claims.map((c) => [c.raceId, c.points]));
  const items: ShelfItem[] = logs.map((l) => ({
    id: l.id,
    name: l.race?.name ?? l.customRaceName ?? "Corrida",
    date: l.raceDate,
    city: l.race?.city ?? l.customCity,
    state: l.race?.state ?? l.customState,
    imageUrl: l.race?.imageUrl ?? null,
    type: l.race?.type ?? "RUA",
    distanceKm: l.distanceKm,
    finishSeconds: l.finishSeconds,
    rating: l.rating,
    points: l.raceId ? (pointsByRace.get(l.raceId) ?? null) : null,
  }));

  const onShelf = new Set(logs.map((l) => l.raceId));
  const options: ShelfOption[] = past
    .filter((r) => !onShelf.has(r.id))
    .map((r) => ({
      id: r.id,
      label: `${formatDateShort(r.startsAt)} · ${r.name} (${r.city}/${r.state})`,
      distances: r.distancesKm.map((km) => ({ km, label: formatDistance(km) })),
    }));

  const stats = shelfStats(items);
  const rated = items.filter((i) => i.rating !== null).length;
  const years = Map.groupBy(items, (i) => Number(brtDay(i.date).slice(0, 4)));

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden bg-asfalto-950 text-white">
        <div className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-14">
          <h1 className="font-display text-6xl leading-[0.9] font-extrabold italic uppercase md:text-7xl">Minhas corridas</h1>
          <p className="mt-4 max-w-xl text-lg text-asfalto-300">
            Cada prova que você já correu, com a sua nota. Suas avaliações aparecem na página da prova e ajudam quem vai correr a próxima.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
            <Stat label="Corridas" value={stats.runs.toLocaleString("pt-BR")} accent />
            <Stat label="Km corridos" value={stats.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <Stat label="Cidades" value={stats.cities.toLocaleString("pt-BR")} />
            <Stat label="Avaliadas" value={`${rated}/${stats.runs}`} />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-8">
        <details open={!items.length} className="group rounded-3xl bg-white p-6 ring-1 ring-asfalto-100 md:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span>
              <span className="block font-display text-3xl font-bold uppercase">Adicionar corrida</span>
              <span className="text-sm text-asfalto-500">Escolha a prova, diga a distância e, se quiser, o seu tempo. Depois você avalia.</span>
            </span>
            <span className="rounded-full bg-largada-500 px-4 py-2 text-sm font-semibold text-asfalto-950 group-open:hidden">Adicionar</span>
            <span className="hidden text-sm text-asfalto-500 group-open:inline">Fechar</span>
          </summary>
          <div className="mt-6 max-w-3xl">
            <AddRunForm races={options} today={brtDay(now)} />
          </div>
        </details>

        {items.length ? (
          [...years].map(([year, runs]) => <YearShelf key={year} year={year} runs={runs} />)
        ) : (
          <p className="text-center text-asfalto-500">
            Sua estante está vazia. Adicione a primeira corrida acima, ou abra a página de uma prova que você correu e clique em
            “Adicionar às minhas corridas”.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-asfalto-300">{label}</dt>
      <dd className={`mt-1 font-display text-5xl leading-none font-extrabold tabular-nums ${accent ? "text-pace-500" : ""}`}>{value}</dd>
    </div>
  );
}

/** Uma prateleira por ano, com as capas (cartazes) das provas lado a lado. */
function YearShelf({ year, runs }: { year: number; runs: ShelfItem[] }) {
  const km = runs.reduce((n, r) => n + (r.distanceKm ?? 0), 0);
  return (
    <section aria-labelledby={`ano-${year}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`ano-${year}`} className="font-display text-5xl font-extrabold italic">
          {year}
        </h2>
        <p className="text-sm text-asfalto-500">
          {runs.length} {runs.length === 1 ? "corrida" : "corridas"}
          {km > 0 && `, ${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {runs.map((r) => (
          <li key={r.id}>
            <Cover run={r} />
          </li>
        ))}
      </ul>
      {/* A tábua da prateleira */}
      <div className="mt-6 h-2 rounded-full bg-asfalto-950" aria-hidden />
    </section>
  );
}

function Cover({ run }: { run: ShelfItem }) {
  return (
    <Link href={`/minhas-corridas/${run.id}`} className="group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-largada-500">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-asfalto-950 shadow-[5px_6px_0_0_rgb(0_0_0/0.12)] ring-1 ring-asfalto-950/10 transition-transform group-hover:-translate-y-1">
        <RaceVisual imageUrl={run.imageUrl} type={run.type} name={run.name} className="h-full w-full" />
        {run.distanceKm !== null && (
          <span className="absolute top-2 left-2 rounded bg-white px-1.5 py-0.5 font-display text-sm font-extrabold text-asfalto-950 tabular-nums shadow">
            {shortKm(run.distanceKm)}
          </span>
        )}
        {run.points !== null && (
          <span className="absolute top-2 right-2 rounded bg-pace-500 px-1.5 py-0.5 text-xs font-bold text-asfalto-950 tabular-nums shadow">
            +{run.points} pts
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-tight font-semibold group-hover:text-largada-600">{run.name}</p>
      <p className="mt-0.5 text-xs text-asfalto-500">
        {formatDateShort(run.date)}
        {run.city && run.state && ` · ${run.city}/${run.state}`}
        {run.finishSeconds !== null && ` · ${formatFinishTime(run.finishSeconds)}`}
      </p>
      <div className="mt-1">
        {run.rating !== null ? (
          <Stars value={run.rating} className="h-3.5 w-3.5" />
        ) : (
          <span className="text-xs font-semibold text-largada-600">Avaliar</span>
        )}
      </div>
    </Link>
  );
}
