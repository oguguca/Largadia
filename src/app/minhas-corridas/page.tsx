import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, formatDistance } from "@/lib/format";
import { RunCover } from "@/components/biblioteca/run-cover";
import { Stars } from "@/components/biblioteca/stars";
import { brtDay, hasStarted, MAX_YEARS_AHEAD, personalRecords, shelfStats, type PersonalRecord } from "@/domain/biblioteca/biblioteca";
import { photoUrl } from "@/domain/biblioteca/salvar";
import { formatFinishTime } from "@/domain/pontos/pontos";
import type { RaceType } from "@/generated/prisma/enums";
import { AddRunForm, type ShelfOption } from "./add-run-form";

export const metadata: Metadata = { title: "Minhas corridas", robots: { index: false } };

export default function MinhasCorridasPage(props: PageProps<"/minhas-corridas">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse bg-asfalto-950" />}>
      <Shelf searchParams={props.searchParams} />
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
  photoUrl: string | null;
  type: RaceType;
  distanceKm: number | null;
  finishSeconds: number | null;
  rating: number | null;
  points: number | null;
  virtual: boolean;
  /** Prova que ainda vai acontecer */
  upcoming: boolean;
};

/** "10K", "21,1K": a distância como vem no número de peito. */
const shortKm = (km: number) => `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K`;

/** Dias de Brasília até a prova: "Hoje", "Amanhã", "Em 5 dias". */
function countdown(date: Date, now: Date) {
  const days = Math.round((Date.parse(brtDay(date)) - Date.parse(brtDay(now))) / 86_400_000);
  return days <= 0 ? "Hoje" : days === 1 ? "Amanhã" : `Em ${days} dias`;
}

/** 330 -> "5:30/km" */
const pace = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}/km`;

async function Shelf({ searchParams }: { searchParams: PageProps<"/minhas-corridas">["searchParams"] }) {
  const user = await requireUser("/minhas-corridas");
  const adding = (await searchParams).adicionar === "1";
  const now = new Date();
  const endOfToday = new Date(`${brtDay(now)}T23:59:59.999-03:00`);
  const [logs, claims, past, future] = await Promise.all([
    db.runLog.findMany({
      where: { userId: user.id },
      orderBy: [{ raceDate: "desc" }, { createdAt: "desc" }],
      include: { race: { select: { name: true, city: true, state: true, imageUrl: true, type: true } } },
    }),
    db.pointClaim.findMany({ where: { userId: user.id, status: "APROVADA", raceId: { not: null } }, select: { raceId: true, points: true } }),
    // Provas do calendário que já aconteceram, para escolher no "Adicionar corrida"
    db.race.findMany({
      where: { moderationStatus: "APROVADA", startsAt: { lte: endOfToday } },
      orderBy: { startsAt: "desc" },
      take: 1500,
      select: { id: true, name: true, city: true, state: true, startsAt: true, distancesKm: true },
    }),
    // E as que ainda vão acontecer, para quem já se inscreveu
    db.race.findMany({
      where: { moderationStatus: "APROVADA", startsAt: { gt: endOfToday } },
      orderBy: { startsAt: "asc" },
      take: 1000,
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
    photoUrl: l.photoId ? photoUrl(l.photoId) : null,
    type: l.race?.type ?? "RUA",
    distanceKm: l.distanceKm,
    finishSeconds: l.finishSeconds,
    rating: l.rating,
    points: l.raceId ? (pointsByRace.get(l.raceId) ?? null) : null,
    virtual: l.virtual,
    upcoming: !hasStarted(l.raceDate, now),
  }));

  const onShelf = new Set(logs.map((l) => l.raceId));
  const options: ShelfOption[] = [...future, ...past]
    .filter((r) => !onShelf.has(r.id))
    .map((r) => ({
      id: r.id,
      label: `${formatDateShort(r.startsAt)} · ${r.name} (${r.city}/${r.state})`,
      distances: r.distancesKm.map((km) => ({ km, label: formatDistance(km) })),
      upcoming: r.startsAt > endOfToday,
    }));

  // Números, recordes e prateleiras por ano só com o que já foi corrido; as futuras ficam numa prateleira só delas
  const done = items.filter((i) => !i.upcoming);
  const upcoming = items.filter((i) => i.upcoming).reverse();
  const stats = shelfStats(done);
  const rated = done.filter((i) => i.rating !== null).length;
  const years = Map.groupBy(done, (i) => Number(brtDay(i.date).slice(0, 4)));
  const records = personalRecords(done);
  const maxDate = `${Number(brtDay(now).slice(0, 4)) + MAX_YEARS_AHEAD}${brtDay(now).slice(4)}`;
  // Sem corridas, o formulário já aparece aberto
  const showForm = adding || !items.length;

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden bg-asfalto-950 text-white">
        <div className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-14 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <h1 className="font-display text-6xl leading-[0.9] font-extrabold italic uppercase md:text-7xl">Minhas corridas</h1>
            <p className="mt-4 max-w-xl text-lg text-asfalto-300">
              Cada prova que você já correu, com a sua nota, e as próximas em que vai largar. Suas avaliações aparecem na página da prova e
              ajudam quem vai correr a próxima.
            </p>
            {!showForm && (
              <Link
                href="/minhas-corridas?adicionar=1#adicionar"
                className="mt-6 inline-block rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
              >
                Adicionar corrida
              </Link>
            )}
            <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
              <Stat label="Corridas" value={stats.runs.toLocaleString("pt-BR")} accent />
              <Stat label="Km corridos" value={stats.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
              <Stat label="Cidades" value={stats.cities.toLocaleString("pt-BR")} />
              <Stat label="Avaliadas" value={`${rated}/${stats.runs}`} />
            </dl>
          </div>
          {done.length > 0 && <Records records={records} />}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-10">
        {showForm && (
          <section id="adicionar" className="scroll-mt-20 rounded-3xl bg-white p-6 ring-1 ring-asfalto-100 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold uppercase">Adicionar corrida</h2>
                <p className="text-sm text-asfalto-500">
                  Escolha a prova, já corrida ou que você ainda vai correr, e diga a distância. A avaliação abre no dia da prova.
                </p>
              </div>
              {items.length > 0 && (
                <Link href="/minhas-corridas" className="text-sm text-asfalto-500 underline hover:text-asfalto-900">
                  Fechar
                </Link>
              )}
            </div>
            <div className="mt-6 max-w-3xl">
              <AddRunForm races={options} today={brtDay(now)} maxDate={maxDate} />
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <ShelfSection id="proximas" title="Próximas largadas" runs={upcoming} now={now} addSlot>
            {upcoming.length} {upcoming.length === 1 ? "prova marcada" : "provas marcadas"}
          </ShelfSection>
        )}
        {items.length ? (
          [...years].map(([year, runs], i) => (
            <ShelfSection key={year} id={`ano-${year}`} title={String(year)} runs={runs} now={now} addSlot={!upcoming.length && i === 0}>
              {runs.length} {runs.length === 1 ? "corrida" : "corridas"}
              {runs.some((r) => r.distanceKm) &&
                `, ${runs.reduce((n, r) => n + (r.distanceKm ?? 0), 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}
            </ShelfSection>
          ))
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

/** Melhor tempo em cada distância. Sem tempos informados, explica como aparecem. */
function Records({ records }: { records: PersonalRecord[] }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <h2 className="font-display text-xl font-bold uppercase">Recordes pessoais</h2>
      {records.length ? (
        <ul className="mt-3 divide-y divide-white/10">
          {records.slice(0, 5).map((r) => (
            <li key={r.distanceKm}>
              <Link href={`/minhas-corridas/${r.logId}`} className="group grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3 py-2.5">
                <span className="font-display text-2xl font-extrabold text-pace-500 tabular-nums">{shortKm(r.distanceKm)}</span>
                <span className="truncate text-sm text-asfalto-300 group-hover:text-white">{r.name}</span>
                <span className="text-right">
                  <span className="block font-display text-2xl leading-none font-extrabold tabular-nums">{formatFinishTime(r.seconds)}</span>
                  <span className="text-xs text-asfalto-300 tabular-nums">{pace(r.paceSeconds)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-asfalto-300">Informe o seu tempo nas corridas e o melhor de cada distância aparece aqui.</p>
      )}
    </div>
  );
}

/** Uma prateleira por ano: as capas (cartazes) ficam em pé sobre a tábua, e o nome e a nota vêm embaixo dela. */
function ShelfSection({
  id,
  title,
  runs,
  now,
  addSlot,
  children,
}: {
  id: string;
  title: string;
  runs: ShelfItem[];
  now: Date;
  /** A primeira vaga vazia leva ao "Adicionar corrida" (só numa prateleira da página) */
  addSlot: boolean;
  /** Resumo à direita do título */
  children: React.ReactNode;
}) {
  const first = addSlot;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-display text-5xl font-extrabold italic uppercase">
          {title}
        </h2>
        <p className="text-sm text-asfalto-500">{children}</p>
      </div>
      {/* Sem espaço entre colunas: cada capa leva o seu pedaço de tábua, e os pedaços formam uma tábua só na linha */}
      <ul className="mt-4 grid grid-cols-2 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {runs.map((r) => (
          <li key={r.id}>
            <Cover run={r} year={Number(brtDay(r.date).slice(0, 4))} now={now} />
          </li>
        ))}
        {[1, 2, 3].map((k) => (
          <li key={`vazio-${k}`} aria-hidden={!(first && k === 1) || undefined} className={emptySlotClass(runs.length, k)}>
            <EmptySlot add={first && k === 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Colunas da estante em cada largura: celular, md e lg (as mesmas do grid). Classes por extenso para o Tailwind achar. */
const COLUMNS = [
  { cols: 2, show: "block", hide: "hidden" },
  { cols: 3, show: "md:block", hide: "md:hidden" },
  { cols: 4, show: "lg:block", hide: "lg:hidden" },
];

/**
 * Espaços vazios que completam a última linha, para a tábua ir de ponta a ponta.
 * O k-ésimo vazio só aparece nas larguras em que faltam pelo menos k capas na linha.
 */
function emptySlotClass(count: number, k: number) {
  return COLUMNS.map(({ cols, show, hide }) => ((cols - (count % cols)) % cols >= k ? show : hide)).join(" ");
}

/** Vaga na prateleira. A primeira da prateleira mais recente leva ao "Adicionar corrida". */
function EmptySlot({ add }: { add: boolean }) {
  const slot = "aspect-[4/5] rounded-t-md";
  return (
    <div>
      <div className="px-2.5 sm:px-3">
        {add ? (
          <Link
            href="/minhas-corridas?adicionar=1#adicionar"
            className={`${slot} flex flex-col items-center justify-center gap-2 border-2 border-b-0 border-dashed border-asfalto-300 text-sm font-semibold text-asfalto-500 hover:border-largada-500 hover:text-largada-600`}
          >
            <span className="font-display text-4xl leading-none">+</span>
            Adicionar corrida
          </Link>
        ) : (
          <div className={slot} />
        )}
      </div>
      <div className="h-3 border-t-2 border-asfalto-700 bg-asfalto-950 shadow-[0_6px_8px_-4px_rgb(0_0_0/0.35)]" />
    </div>
  );
}

function Cover({ run, year, now }: { run: ShelfItem; year: number; now: Date }) {
  const place = run.virtual ? "Virtual" : run.city && run.state ? `${run.city}/${run.state}` : null;
  return (
    <Link href={`/minhas-corridas/${run.id}`} className="group block focus-visible:outline-none">
      <div className="px-2.5 sm:px-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-md bg-asfalto-950 ring-1 ring-asfalto-950/10 transition-transform group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5 group-focus-visible:ring-4 group-focus-visible:ring-largada-500">
          <RunCover photoUrl={run.photoUrl} imageUrl={run.imageUrl} type={run.type} name={run.name} year={year} place={place} />
        </div>
      </div>
      {/* Tábua: borda clara em cima e sombra embaixo, para a capa parecer apoiada */}
      <div className="h-3 border-t-2 border-asfalto-700 bg-asfalto-950 shadow-[0_6px_8px_-4px_rgb(0_0_0/0.35)]" aria-hidden />

      <div className="px-2.5 pt-3 sm:px-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {run.distanceKm !== null && (
            <span className="font-display text-lg leading-none font-extrabold tabular-nums">{shortKm(run.distanceKm)}</span>
          )}
          {run.finishSeconds !== null && <span className="text-sm font-semibold tabular-nums">{formatFinishTime(run.finishSeconds)}</span>}
          {run.points !== null && (
            <span className="rounded bg-pace-500 px-1.5 py-0.5 text-xs font-bold text-asfalto-950 tabular-nums">+{run.points} pts</span>
          )}
        </p>
        <p className="mt-1.5 line-clamp-2 leading-tight font-semibold group-hover:text-largada-600">{run.name}</p>
        <p className="mt-1 text-sm text-asfalto-500">
          {formatDateShort(run.date)}
          {place && ` · ${place}`}
        </p>
        <div className="mt-2">
          {run.upcoming ? (
            <span className="rounded bg-asfalto-950 px-2 py-0.5 text-xs font-bold text-white">{countdown(run.date, now)}</span>
          ) : run.rating !== null ? (
            <span className="flex items-center gap-1.5">
              <Stars value={run.rating} className="h-4 w-4" />
              <span className="text-sm font-semibold tabular-nums">{run.rating.toLocaleString("pt-BR")}</span>
            </span>
          ) : (
            <span className="text-sm font-semibold text-largada-600">Avaliar</span>
          )}
        </div>
      </div>
    </Link>
  );
}
