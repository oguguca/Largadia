import Link from "next/link";
import { Suspense } from "react";
import {
  getCitiesWithRaces,
  getFeaturedRaces,
  getMonthRaces,
  getOpeningSoonRaces,
  getStatesWithRaces,
  getUpcomingRaces,
  getWeekendRaces,
} from "@/domain/corridas/queries";
import { RaceGrid } from "@/components/corridas/race-card";
import { HeroTrack } from "@/components/home/hero-track";
import { slogan } from "@/lib/site";
import { MONTH_LABELS, monthPath, shiftMonth } from "@/lib/months";
import { connection } from "next/server";
import { flags } from "@/config/flags";
import { getOpenRaffles, raffleViewer } from "@/domain/sorteios/queries";
import { RaffleCard } from "@/components/sorteios/raffle-card";
import { RankingTable } from "@/components/pontos/ranking-table";
import { getPointsRanking, getSeasonChampion } from "@/domain/pontos/ranking";
import { previousSeason, seasonOf } from "@/domain/pontos/temporada";
import { SeasonBanner } from "@/components/pontos/season-banner";
import { pontos, temporada } from "@/config/pontos";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-asfalto-950 text-white">
        <div className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90" aria-hidden />
        <HeroTrack className="pointer-events-none absolute top-1/2 -right-80 hidden w-[56rem] -translate-y-1/2 lg:block" />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 lg:pt-24 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="font-display text-6xl leading-[0.85] font-extrabold italic uppercase sm:text-7xl lg:text-8xl">{slogan}</h1>
            <Suspense fallback={<p className="mt-6 h-14" />}>
              <HeroStats />
            </Suspense>
            <form action="/busca" className="mt-6 flex gap-2 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/30">
              <label htmlFor="q" className="sr-only">
                Buscar corrida
              </label>
              <input
                id="q"
                name="q"
                placeholder="Cidade, prova ou organizador"
                className="min-w-0 flex-1 rounded-xl px-3 text-asfalto-950 outline-none"
              />
              <button className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600">
                Buscar
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {[
                ["5k", "/busca?dist=ate-5"],
                ["10k", "/busca?dist=6-10"],
                ["Meia maratona", "/busca?dist=11-21"],
                ["Maratona", "/busca?dist=22-42"],
                ["Trail", "/busca?tipo=TRAIL"],
                ["Noturnas", "/busca?tipo=NOTURNA"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="rounded-full border border-white/20 px-3 py-1 hover:border-pace-500 hover:text-pace-500">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        <Suspense>
          <Featured />
        </Suspense>

        <Section title="Calendário" href="/calendario">
          <Suspense fallback={<GridSkeleton />}>
            <UpcomingByMonth />
          </Suspense>
        </Section>

        <Suspense>
          <OpenRaffles />
        </Suspense>

        <Suspense>
          <TopRanking />
        </Suspense>

        <Suspense>
          <States />
        </Suspense>

        <Section title="Largadas deste fim de semana" href="/busca">
          <Suspense fallback={<GridSkeleton />}>
            <WeekendRaces />
          </Suspense>
        </Section>

        <Section title="Inscrições abrindo em breve">
          <Suspense fallback={<GridSkeleton />}>
            <OpeningSoon />
          </Suspense>
        </Section>

        <Suspense>
          <Cities />
        </Suspense>
      </div>
    </>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold uppercase md:text-3xl">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-largada-600 hover:underline">
            Ver todas
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

async function Featured() {
  const races = await getFeaturedRaces();
  if (!races.length) return null;
  return (
    <Section title="Em destaque">
      <RaceGrid races={races} />
    </Section>
  );
}

/** "481 provas em 23 estados", contado das provas futuras publicadas. */
async function HeroStats() {
  const states = await getStatesWithRaces();
  const total = states.reduce((n, s) => n + s.count, 0);
  if (!total) return null;
  return (
    <p className="mt-6 text-lg text-asfalto-300">
      <strong className="font-semibold text-white">{total.toLocaleString("pt-BR")} provas</strong> marcadas em {states.length}{" "}
      {states.length === 1 ? "estado" : "estados"}. Escolha a sua e faça a inscrição no site oficial.
    </p>
  );
}

/** Quantas provas cada mês mostra na página inicial; o resto fica no link do mês. */
const RACES_PER_MONTH = 8;
const MONTHS_ON_HOME = 4;

/** Provas futuras dos próximos meses (horário de Brasília), com abas que levam a cada mês. */
async function UpcomingByMonth() {
  await connection();
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 3600_000);
  // 00h de hoje em Brasília: provas de hoje continuam na página até o fim do dia
  const startOfToday = new Date(Math.floor(brt.getTime() / 86_400_000) * 86_400_000 + 3 * 3600_000);
  const first = { year: brt.getUTCFullYear(), month: brt.getUTCMonth() + 1 };
  const months = (
    await Promise.all(
      Array.from({ length: MONTHS_ON_HOME }, async (_, i) => {
        const m = shiftMonth(first.year, first.month, i);
        // Filtra pela hora deste acesso (não pelo cache): o mês corrente vai encolhendo e, na virada, sai da página
        const races = (await getMonthRaces(m.year, m.month)).filter((r) => r.startsAt >= startOfToday);
        return { ...m, races };
      }),
    )
  ).filter((m) => m.races.length);

  if (!months.length) {
    return (
      <p className="rounded-2xl bg-white p-4 text-asfalto-500 ring-1 ring-asfalto-100">
        Estamos montando o calendário. As primeiras provas aparecem aqui em breve.
      </p>
    );
  }
  const id = (m: { year: number; month: number }) => `mes-${m.year}-${m.month}`;
  return (
    <>
      <nav aria-label="Meses" className="-mx-4 overflow-x-auto px-4 pb-1">
        <ul className="flex gap-2">
          {months.map((m) => (
            <li key={id(m)}>
              <a
                href={`#${id(m)}`}
                className="flex items-baseline gap-2 rounded-xl bg-asfalto-950 px-4 py-2 whitespace-nowrap text-white hover:bg-asfalto-800"
              >
                <span className="font-display text-lg font-bold capitalize">{MONTH_LABELS[m.month - 1]}</span>
                <span className="text-sm text-pace-500 tabular-nums">{m.races.length} provas</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* Cada mês num bloco próprio, com faixa escura no topo: fica claro onde um mês termina e o outro começa */}
      <div className="mt-6 space-y-12">
        {months.map((m) => (
          <section
            key={id(m)}
            id={id(m)}
            aria-labelledby={`${id(m)}-titulo`}
            className="scroll-mt-20 overflow-hidden rounded-3xl bg-white ring-1 ring-asfalto-100"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-asfalto-950 px-5 py-4 text-white">
              <h3 id={`${id(m)}-titulo`} className="font-display text-4xl leading-none font-extrabold uppercase italic md:text-5xl">
                {MONTH_LABELS[m.month - 1]} <span className="text-largada-500">{m.year}</span>
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-asfalto-300">
                  <strong className="font-display text-2xl text-pace-500 tabular-nums">{m.races.length}</strong>{" "}
                  {m.races.length === 1 ? "prova" : "provas"}
                </span>
                <Link
                  href={monthPath(m.year, m.month)}
                  className="rounded-xl bg-largada-500 px-4 py-2 text-sm font-semibold whitespace-nowrap text-asfalto-950 hover:bg-largada-600"
                >
                  Ver todas de {MONTH_LABELS[m.month - 1]}
                </Link>
              </div>
            </div>
            <div className="bg-asfalto-50 p-4 md:p-5">
              <RaceGrid races={m.races.slice(0, RACES_PER_MONTH)} />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/** Sorteios abertos cadastrados no admin. Some enquanto a flag estiver desligada ou não houver sorteio aberto. */
async function OpenRaffles() {
  if (!flags.sorteiosAtivos) return null;
  await connection();
  const raffles = await getOpenRaffles(3);
  if (!raffles.length) return null;
  const { viewer, entered } = await raffleViewer(raffles.map((r) => r.id));
  return (
    <Section title="Sorteios abertos" href="/assinatura">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {raffles.map((r) => (
          <RaffleCard key={r.id} raffle={r} viewer={viewer} entered={entered.has(r.id)} />
        ))}
      </div>
    </Section>
  );
}

const HOME_RANKING_SIZE = 5;

/** Topo do ranking de pontos dos assinantes, para quem ainda não assina ver o que está em jogo. */
async function TopRanking() {
  await connection();
  const now = new Date();
  const season = seasonOf(now);
  const [{ rows }, champion] = await Promise.all([
    getPointsRanking(null, season, HOME_RANKING_SIZE),
    getSeasonChampion(previousSeason(season)),
  ]);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase md:text-3xl">Ranking dos corredores</h2>
          <p className="text-sm text-asfalto-500">
            Assinantes Premium ganham {pontos.porProva} pontos por prova concluída, mais {pontos.porKm} por km. A cada{" "}
            {temporada.meses} meses, o 1º lugar leva {temporada.premio}.
          </p>
        </div>
        <Link href="/assinatura" className="rounded-full bg-largada-500 px-4 py-2 text-sm font-semibold text-asfalto-950 hover:bg-largada-600">
          Assine e entre no ranking
        </Link>
      </div>
      <SeasonBanner season={season} now={now} champion={champion} />
      <RankingTable
        rows={rows}
        empty={
          <>
            O ranking começa com as primeiras corridas aprovadas.{" "}
            <Link href="/assinatura" className="font-semibold text-largada-600 hover:underline">
              Assine e seja o primeiro a pontuar
            </Link>
            .
          </>
        }
      />
    </section>
  );
}

/** Provas futuras por UF, com barra proporcional ao estado com mais provas. */
async function States() {
  const states = await getStatesWithRaces();
  if (states.length < 2) return null;
  const max = states[0].count;
  return (
    <Section title="Por estado">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
        {states.map((s) => (
          <li key={s.state}>
            <Link href={`/busca?uf=${s.state}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white">
              <span className="w-8 font-display text-xl font-bold">{s.state}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-asfalto-100" aria-hidden>
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-largada-500"
                  style={{ width: `${Math.max(6, (s.count / max) * 100)}%` }}
                />
              </span>
              <span className="w-10 text-right text-sm text-asfalto-500 tabular-nums group-hover:text-asfalto-950">{s.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function WeekendRaces() {
  const weekend = await getWeekendRaces();
  if (weekend.length) return <RaceGrid races={weekend.slice(0, 8)} />;
  // Sem provas no fim de semana: mostra as próximas para a seção não ficar vazia
  const next = await getUpcomingRaces(4);
  if (!next.length) {
    return (
      <p className="rounded-2xl bg-white p-4 text-asfalto-500 ring-1 ring-asfalto-100">
        Estamos montando o calendário. As primeiras provas aparecem aqui em breve.
      </p>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-asfalto-500">Nenhuma largada neste fim de semana. Veja as próximas:</p>
      <RaceGrid races={next} />
    </>
  );
}

async function OpeningSoon() {
  const races = await getOpeningSoonRaces();
  if (!races.length) return <p className="text-asfalto-500">Nenhuma inscrição prevista para abrir em breve.</p>;
  return <RaceGrid races={races} />;
}

async function Cities() {
  const cities = await getCitiesWithRaces();
  // Sem provas publicadas a seção some, em vez de mostrar só o título
  if (!cities.length) return null;
  return (
    <Section title="Corridas por cidade">
      <ul className="flex flex-wrap gap-2">
        {cities.slice(0, 24).map((c) => (
          <li key={c.citySlug}>
            <Link
              href={`/corridas/${c.citySlug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-asfalto-100 hover:ring-largada-500"
            >
              {c.city}/{c.state}
              <span className="rounded-full bg-asfalto-100 px-1.5 text-xs font-semibold">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-asfalto-100 sm:h-64" />
      ))}
    </div>
  );
}
