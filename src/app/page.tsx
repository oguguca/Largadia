import Link from "next/link";
import { cache, Suspense } from "react";
import {
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
import { daysLeft, lastDay, previousSeason, seasonOf } from "@/domain/pontos/temporada";
import { pontos, temporada } from "@/config/pontos";
import { PREMIUM_PRICE_CENTS } from "@/config/assinatura";
import { currentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { isPremium } from "@/domain/assinatura/status";
import { formatDateShort } from "@/lib/format";

const price = (PREMIUM_PRICE_CENTS / 100).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Quem está vendo a página: decide se os convites viram atalhos da área Premium. Uma consulta por acesso. */
const getViewer = cache(async () => {
  const session = await currentSession();
  if (!session?.user?.id) return { id: null, premium: false };
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  return { id: user?.id ?? null, premium: !!user && isPremium(user) };
});

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
              <button className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600">Buscar</button>
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
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-white/20 px-3 py-1 hover:border-pace-500 hover:text-pace-500"
                >
                  {label}
                </Link>
              ))}
            </div>
            <Suspense>
              <HeroPremium />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-asfalto-100" />}>
          <PlansOrMember />
        </Suspense>

        <Suspense>
          <Featured />
        </Suspense>

        <Section
          title="Calendário"
          text="As próximas provas, mês a mês. O mês que termina sai daqui sozinho."
          href="/calendario"
          linkLabel="Calendário completo"
        >
          <Suspense fallback={<GridSkeleton />}>
            <UpcomingByMonth />
          </Suspense>
        </Section>
      </div>

      <Suspense>
        <PremiumBand />
      </Suspense>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <Section title="Largadas deste fim de semana" href="/busca" linkLabel="Buscar provas">
          <Suspense fallback={<GridSkeleton />}>
            <WeekendRaces />
          </Suspense>
        </Section>

        <Section title="Inscrições abrindo em breve" text="Provas que já têm data para abrir as inscrições.">
          <Suspense fallback={<GridSkeleton />}>
            <OpeningSoon />
          </Suspense>
        </Section>

        <Suspense>
          <States />
        </Suspense>
      </div>
    </>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`mt-0.5 size-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Convite do topo: para quem não assina, chama para o Premium; para o assinante, mostra a posição dele. */
async function HeroPremium() {
  const viewer = await getViewer();
  const pill =
    "mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-2 pr-4 pl-2 text-sm text-asfalto-300 hover:border-largada-500/60 hover:text-white";
  const tag = "rounded-lg bg-largada-500 px-2 py-1 font-display font-bold text-asfalto-950 uppercase";
  if (!viewer.premium) {
    return (
      <a href="#premium" className={pill}>
        <span className={tag}>Premium</span>
        Suas corridas valem pontos e você concorre aos sorteios de prêmios.
      </a>
    );
  }
  const { viewer: me } = await getPointsRanking(viewer.id, seasonOf(new Date()), 0);
  return (
    <a href="#sua-temporada" className={pill}>
      <span className={tag}>{me ? `${me.position}º` : "Premium"}</span>
      {me?.points ? `Você tem ${me.points} pontos nesta temporada.` : "Registre sua primeira corrida e comece a pontuar."}
    </a>
  );
}

async function PlansOrMember() {
  const viewer = await getViewer();
  return viewer.premium && viewer.id ? <MemberSummary userId={viewer.id} /> : <Plans />;
}

/** Para o assinante, no lugar da comparação de planos: a temporada dele e os atalhos do dia a dia. */
async function MemberSummary({ userId }: { userId: string }) {
  const now = new Date();
  const season = seasonOf(now);
  const [{ rows, viewer: me }, pending] = await Promise.all([
    getPointsRanking(userId, season, 1000),
    db.pointClaim.count({ where: { userId, status: "PENDENTE" } }),
  ]);
  const left = daysLeft(season, now);
  const leader = rows[0];
  const stats = [
    ["Posição", me ? `${me.position}º` : "—", me ? `de ${rows.length}` : ""],
    ["Pontos", (me?.points ?? 0).toLocaleString("pt-BR"), leader && me && leader.userId !== me.userId ? `1º tem ${leader.points}` : ""],
    ["Provas", String(me?.races ?? 0), "aprovadas"],
    ["Km", (me?.km ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }), "na temporada"],
  ] as const;

  return (
    <section
      id="sua-temporada"
      aria-labelledby="sua-temporada-titulo"
      className="relative scroll-mt-20 overflow-hidden rounded-3xl bg-asfalto-950 p-6 text-white md:p-8"
    >
      <div className="faixa-largada absolute inset-x-0 top-0 h-1.5" aria-hidden />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="sua-temporada-titulo" className="font-display text-3xl font-bold uppercase md:text-4xl">
            Sua temporada
          </h2>
          <p className="mt-1 text-asfalto-300">
            {season.label}, termina em {formatDateShort(lastDay(season))}.{" "}
            <span className="text-pace-500">{left === 0 ? "Último dia" : `Faltam ${left} ${left === 1 ? "dia" : "dias"}`}</span> para subir
            no ranking.{temporada.premio && ` O 1º ganha ${temporada.premio}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/assinatura#registrar"
            className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
          >
            Registrar uma corrida
          </Link>
          <Link href="/assinatura" className="font-semibold underline-offset-4 hover:underline">
            Abrir a área Premium
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-4">
        {stats.map(([label, value, note]) => (
          <div key={label} className="bg-asfalto-950 p-4 md:p-5">
            <dt className="text-xs text-asfalto-300">{label}</dt>
            <dd className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">{value}</dd>
            {note && <dd className="mt-1 text-xs text-asfalto-300">{note}</dd>}
          </div>
        ))}
      </dl>

      {pending > 0 && (
        <p className="mt-4 text-sm text-asfalto-300">
          {pending === 1 ? "1 corrida sua está" : `${pending} corridas suas estão`} em análise. Os pontos entram assim que forem aprovadas.
        </p>
      )}
    </section>
  );
}

/** O que é o Largadia, separado em grátis e Premium: quem chega entende o que ganha assinando. */
async function Plans() {
  const [states, viewer] = await Promise.all([getStatesWithRaces(), getViewer()]);
  const total = states.reduce((n, s) => n + s.count, 0);
  const free = [
    total
      ? `${total.toLocaleString("pt-BR")} provas de ${states.length} estados num calendário só`
      : "Provas de todo o Brasil num calendário só",
    "Busca por cidade, distância, tipo e data",
    "Inscrição direto no site oficial da prova, sem taxa do Largadia",
  ];
  const premium = [
    `${pontos.porProva} pontos por prova concluída, mais ${pontos.porKm} por km`,
    temporada.premio
      ? `Ranking por temporada de ${temporada.meses} meses: o 1º lugar ganha ${temporada.premio}`
      : `Ranking por temporada de ${temporada.meses} meses com os outros assinantes`,
    "Sorteios de prêmios só para assinantes",
  ];

  return (
    <section aria-labelledby="planos-titulo">
      <h2 id="planos-titulo" className="font-display text-3xl font-bold uppercase md:text-4xl">
        O que é o Largadia
      </h2>
      <p className="mt-1 max-w-2xl text-asfalto-500">
        Um calendário de corridas de rua que junta as provas espalhadas pelas plataformas de inscrição. Para quem quer mais, o Premium
        transforma cada prova em pontos.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-asfalto-100 md:p-8">
          <p className="font-display text-2xl font-bold uppercase">Grátis</p>
          <p className="text-sm text-asfalto-500">Para todo corredor, sem cadastro</p>
          <ul className="mt-6 flex-1 space-y-3">
            {free.map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="text-asfalto-500" />
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/calendario"
            className="mt-8 self-start rounded-xl px-5 py-3 font-semibold ring-1 ring-asfalto-300 hover:bg-asfalto-50"
          >
            Ver o calendário
          </Link>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-3xl bg-asfalto-950 p-6 text-white md:p-8">
          <div className="faixa-largada absolute inset-x-0 top-0 h-1.5" aria-hidden />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-bold text-largada-500 uppercase">Premium</p>
              <p className="text-sm text-asfalto-300">Tudo do grátis, e suas corridas viram pontos</p>
            </div>
            <p className="text-right">
              <span className="font-display text-4xl font-extrabold tabular-nums">{price}</span>
              <span className="block text-xs text-asfalto-300">por mês</span>
            </p>
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {premium.map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="text-largada-500" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            {viewer.premium ? (
              <>
                <Link
                  href="/assinatura#registrar"
                  className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
                >
                  Registrar uma corrida
                </Link>
                <span className="text-sm text-pace-500">Você já é Premium</span>
              </>
            ) : (
              <>
                <Link
                  href="/assinatura#plano"
                  className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
                >
                  Assinar o Premium
                </Link>
                <span className="text-sm text-asfalto-300">No cartão ou no Pix pré-pago</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({
  title,
  text,
  href,
  linkLabel = "Ver todas",
  children,
}: {
  title: string;
  text?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase md:text-4xl">{title}</h2>
          {text && <p className="mt-1 text-asfalto-500">{text}</p>}
        </div>
        {href && (
          <Link href={href} className="text-sm font-semibold text-largada-600 hover:underline">
            {linkLabel}
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
/** Meses com provas na página; os seguintes aparecem só nas abas, com link para a página do mês. */
const MONTHS_SHOWN = 2;
const MONTHS_IN_TABS = 4;

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
      Array.from({ length: MONTHS_IN_TABS }, async (_, i) => {
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
  const shown = months.slice(0, MONTHS_SHOWN);
  return (
    <>
      <nav aria-label="Meses" className="-mx-4 overflow-x-auto px-4 pb-1">
        <ul className="flex gap-2">
          {months.map((m, i) => (
            <li key={id(m)}>
              <a
                // Meses que não cabem na página levam direto para a página do mês
                href={i < MONTHS_SHOWN ? `#${id(m)}` : monthPath(m.year, m.month)}
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
      <div className="mt-6 space-y-10">
        {shown.map((m) => (
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

const HOME_RANKING_SIZE = 5;

/**
 * Faixa escura do Premium, logo depois do calendário: temporada, top 5 do ranking e sorteios.
 * Para quem já assina, os convites viram atalhos para registrar corrida.
 */
async function PremiumBand() {
  await connection();
  const now = new Date();
  const season = seasonOf(now);
  const viewer = await getViewer();
  const [{ rows }, champion, raffles] = await Promise.all([
    getPointsRanking(viewer.id, season, HOME_RANKING_SIZE),
    getSeasonChampion(previousSeason(season)),
    flags.sorteiosAtivos ? getOpenRaffles(3) : Promise.resolve([]),
  ]);
  const { viewer: raffleUser, entered } = raffles.length
    ? await raffleViewer(raffles.map((r) => r.id))
    : { viewer: "visitante" as const, entered: new Set<string>() };
  const left = daysLeft(season, now);

  return (
    <section id="premium" aria-labelledby="premium-titulo" className="relative scroll-mt-14 overflow-hidden bg-asfalto-950 text-white">
      <div className="faixa-largada absolute inset-x-0 top-0 h-2 opacity-90" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
          <div className="lg:col-span-2">
            <p className="font-display text-xl font-bold text-largada-500 uppercase">Premium</p>
            <h2 id="premium-titulo" className="mt-1 font-display text-5xl leading-[0.9] font-extrabold uppercase italic md:text-6xl">
              {viewer.premium ? "A disputa da temporada" : "Sua próxima corrida vale pontos"}
            </h2>
            <p className="mt-4 text-asfalto-300">
              {viewer.premium
                ? `Cada corrida aprovada soma ${pontos.porProva} pontos, mais ${pontos.porKm} por km. Registre todas as provas que correr para subir na tabela.`
                : `Cada prova concluída rende ${pontos.porProva} pontos, mais ${pontos.porKm} por km. ${temporada.premio ? `Quem terminar a temporada em 1º ganha ${temporada.premio}.` : `Some pontos e dispute o topo do ranking da temporada.`}`}{" "}
              No empate, vence quem correu mais km.
            </p>

            {/* O assinante já vê a temporada e os atalhos no bloco "Sua temporada", lá em cima */}
            {!viewer.premium && (
              <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-white/10 py-5">
                <div>
                  <dt className="text-xs text-asfalto-300">Temporada</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">{season.label}</dd>
                </div>
                <div>
                  <dt className="text-xs text-asfalto-300">Termina em</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">{formatDateShort(lastDay(season))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-asfalto-300">Faltam</dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-pace-500 tabular-nums">
                    {left === 0 ? "último dia" : `${left} ${left === 1 ? "dia" : "dias"}`}
                  </dd>
                </div>
              </dl>
            )}
            {champion && (
              <p className="mt-4 text-sm text-asfalto-300">
                Campeão da temporada anterior: <strong className="text-amber-400">👑 {champion.name}</strong> ({champion.points} pontos)
              </p>
            )}

            {!viewer.premium && (
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/assinatura#plano"
                  className="rounded-xl bg-largada-500 px-6 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
                >
                  Assinar por {price}/mês
                </Link>
                <Link href="/assinatura" className="font-semibold underline-offset-4 hover:underline">
                  Como funciona
                </Link>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <p className="mb-3 font-display text-xl font-bold uppercase">Top {HOME_RANKING_SIZE} da temporada</p>
            <RankingTable
              rows={rows}
              viewerId={viewer.id}
              // Vagas vazias até 5: a tabela tem sempre a mesma altura e mostra que há lugar no topo
              pageSize={HOME_RANKING_SIZE}
              pager={false}
              footer={
                <Link href="/assinatura#ranking" className="font-semibold text-largada-600 hover:underline">
                  Ver o ranking completo
                </Link>
              }
              empty={<>Ninguém pontuou ainda nesta temporada. A 1ª posição está livre.</>}
            />
          </div>
        </div>

        {raffles.length > 0 && (
          <div className="mt-16">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <h3 className="font-display text-3xl font-bold uppercase">Sorteios para assinantes</h3>
                <p className="mt-1 text-asfalto-300">Só quem está com o Premium ativo pode ganhar.</p>
              </div>
              <Link href="/assinatura" className="text-sm font-semibold text-largada-500 hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {raffles.map((r) => (
                <RaffleCard key={r.id} raffle={r} viewer={raffleUser} entered={entered.has(r.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Provas futuras por UF, com barra proporcional ao estado com mais provas. */
async function States() {
  const states = await getStatesWithRaces();
  if (states.length < 2) return null;
  const max = states[0].count;
  return (
    <Section title="Por estado" text="Toque num estado para ver todas as provas dele.">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-3xl bg-white p-4 ring-1 ring-asfalto-100 sm:grid-cols-3 md:p-6 lg:grid-cols-4">
        {states.map((s) => (
          <li key={s.state}>
            <Link href={`/busca?uf=${s.state}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-asfalto-50">
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

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-asfalto-100 sm:h-64" />
      ))}
    </div>
  );
}
