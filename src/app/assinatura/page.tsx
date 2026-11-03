import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { currentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { flags } from "@/config/flags";
import { sorteios } from "@/config/sorteios";
import { pontos, temporada } from "@/config/pontos";
import { PIX_PLANS, PREMIUM_PRICE_CENTS } from "@/config/assinatura";
import { isPremium, PIX_STATUS } from "@/domain/assinatura/status";
import { getOpenRaffles, raffleViewer } from "@/domain/sorteios/queries";
import { getPointsRanking, getSeasonChampion } from "@/domain/pontos/ranking";
import {
  daysLeft,
  lastDay,
  previousSeason,
  seasonOf,
} from "@/domain/pontos/temporada";
import { PrizeShoe } from "@/components/pontos/prize-shoe";
import { PIX_GREEN, PixIcon } from "@/components/pagamento/pix-icon";
import { CardIcon } from "@/components/pagamento/card-icon";
import { SeasonBanner } from "@/components/pontos/season-banner";
import {
  claimRace,
  claimStatusLabels,
  formatFinishTime,
  pointsFor,
  publicName,
} from "@/domain/pontos/pontos";
import { RaffleCard } from "@/components/sorteios/raffle-card";
import { RankingTable } from "@/components/pontos/ranking-table";
import { Paged } from "@/components/paged";
import { chunk } from "@/lib/chunk";
import { formatDateLong, formatDateShort, formatDistance } from "@/lib/format";
import { RegisterRunForm, type RunOption } from "./register-run-form";
import { assinar, assinarPix } from "../conta/actions";

export const metadata: Metadata = {
  title: "Largadia Premium",
  description:
    "Assine o Largadia Premium: pontos a cada corrida, sorteios de inscrições e cupons exclusivos.",
};

const price = (PREMIUM_PRICE_CENTS / 100).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const perks = [
  {
    title: temporada.premio ? "Ranking com prêmio" : "Ranking da temporada",
    text: temporada.premio
      ? `Cada prova concluída soma pontos. A cada ${temporada.meses} meses, o 1º lugar do ranking ganha ${temporada.premio}.`
      : `Cada prova concluída soma pontos num ranking que recomeça a cada ${temporada.meses} meses.`,
  },
  {
    title: "Sorteios exclusivos",
    text: "Concorra a inscrições, tênis, suplementos e kits.",
  },
  {
    title: "Cupons de desconto",
    text: "Descontos em provas parceiras do Largadia.",
  },
];

/** Assinante vê a Área Premium (sorteios e ranking); os demais veem a página de assinatura. */
export default function AssinaturaPage() {
  return (
    <Suspense fallback={<HeroShell title="Largadia Premium" />}>
      <PremiumOrSales />
    </Suspense>
  );
}

async function PremiumOrSales() {
  const session = await currentSession();
  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
        },
      })
    : null;
  if (user && isPremium(user)) return <MemberArea user={user} />;
  return <SalesPage loggedIn={!!user} />;
}

function HeroShell({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-asfalto-950 text-white">
      <div
        className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90"
        aria-hidden
      />
      <div
        className="absolute -top-20 -right-24 h-80 w-80 rounded-full bg-largada-500/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-14 md:pt-16">
        <h1 className="font-display text-6xl leading-[0.9] font-extrabold italic uppercase md:text-7xl">
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
}

/* ---------- Assinante ---------- */

type Member = {
  id: string;
  name: string;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
};

async function MemberArea({ user }: { user: Member }) {
  const now = new Date();
  const season = seasonOf(now);
  const lastSeason = previousSeason(season);
  // Aceita provas dos últimos dias, desde que a temporada delas ainda não tenha fechado
  const since = new Date(
    Math.max(
      now.getTime() - pontos.diasParaEnviar * 86_400_000,
      (lastSeason && lastSeason.closesAt > now
        ? lastSeason.start
        : season.start
      ).getTime(),
    ),
  );
  // Fim do dia de hoje em Brasília (00h do dia seguinte, BRT = UTC-3)
  const endOfTodayBrt = new Date(
    Math.floor((now.getTime() - 3 * 3600_000) / 86_400_000 + 1) * 86_400_000 +
      3 * 3600_000,
  );
  const [ranking, champion, claims, recent] = await Promise.all([
    // Até a 1000ª colocação, 10 por página nas setas
    getPointsRanking(user.id, season, 1000),
    getSeasonChampion(lastSeason),
    db.pointClaim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        raceId: true,
        status: true,
        points: true,
        distanceKm: true,
        reviewNote: true,
        finishSeconds: true,
        customRaceName: true,
        customRaceDate: true,
        customCity: true,
        customState: true,
        race: { select: { name: true, startsAt: true, slug: true } },
      },
    }),
    // Provas que ainda aceitam comprovação: já largaram e estão dentro do prazo
    db.race.findMany({
      where: {
        moderationStatus: "APROVADA",
        // Provas de hoje já entram: o horário das importadas é estimado
        startsAt: { gte: since, lt: endOfTodayBrt },
      },
      orderBy: { startsAt: "desc" },
      take: 400,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        startsAt: true,
        distancesKm: true,
      },
    }),
  ]);
  // Recusadas podem ser reenviadas; as outras já estão em análise ou aprovadas
  const taken = new Set(
    claims.filter((c) => c.status !== "RECUSADA").map((c) => c.raceId),
  );
  const options: RunOption[] = recent
    .filter((r) => !taken.has(r.id))
    .map((r) => ({
      id: r.id,
      label: `${formatDateShort(r.startsAt)} · ${r.name} (${r.city}/${r.state})`,
      distances: r.distancesKm.map((km) => ({ km, label: formatDistance(km) })),
      pointsByDistance: Object.fromEntries(
        r.distancesKm.map((km) => [String(km), pointsFor(km)]),
      ),
    }));
  const points = ranking.viewer?.points ?? 0;
  // Limites do campo de data da prova informada à mão (dia de Brasília)
  const brtDay = (d: Date) =>
    new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const plan =
    user.subscriptionStatus === PIX_STATUS && user.subscriptionEndsAt
      ? `Premium no Pix até ${formatDateLong(user.subscriptionEndsAt)}.`
      : "Assinatura no cartão ativa.";

  const left = daysLeft(season, now);

  return (
    <>
      <HeroShell title="Área Premium">
        <p className="mt-4 max-w-xl text-lg text-asfalto-300">
          Bora, {publicName(user.name).split(" ")[0]}! {plan}{" "}
          <Link
            href="/conta"
            className="text-white underline underline-offset-2 hover:text-largada-500"
          >
            Gerenciar assinatura
          </Link>
        </p>
        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-asfalto-300">Seus pontos</dt>
            <dd className="mt-1 font-display text-5xl leading-none font-extrabold text-pace-500 tabular-nums">
              {points.toLocaleString("pt-BR")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-asfalto-300">Sua posição</dt>
            <dd className="mt-1 font-display text-5xl leading-none font-extrabold tabular-nums">
              {ranking.viewer ? `${ranking.viewer.position}º` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-asfalto-300">Fim da temporada</dt>
            <dd className="mt-1 font-display text-5xl leading-none font-extrabold tabular-nums">
              {left}
              <span className="ml-1 text-lg font-semibold text-asfalto-300">
                {left === 1 ? "dia" : "dias"}
              </span>
            </dd>
          </div>
          <div>
            {temporada.premio ? (
              <>
                <dt className="text-sm text-asfalto-300">Prêmio do 1º lugar</dt>
                <dd className="mt-2 font-display text-xl leading-tight font-bold text-amber-400 first-letter:uppercase">
                  👑 {temporada.premio.replace(/^(um|uma) /, "")}
                </dd>
              </>
            ) : (
              <>
                <dt className="text-sm text-asfalto-300">Provas aprovadas</dt>
                <dd className="mt-1 font-display text-5xl leading-none font-extrabold tabular-nums">
                  {ranking.viewer?.races ?? 0}
                </dd>
              </>
            )}
          </div>
        </dl>
      </HeroShell>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <section id="ranking" className="scroll-mt-20">
          <SectionHeading
            title="Ranking da temporada"
            text={`Cada prova concluída vale ${pontos.porProva} pontos, mais ${pontos.porKm} por km. Contam as provas da temporada aprovadas pela equipe.`}
          />
          <SeasonBanner season={season} now={now} champion={champion} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="flex flex-col lg:col-span-3">
              <h3 className="mb-3 font-display text-xl font-bold uppercase">
                Classificação
              </h3>
              <RankingTable
                rows={ranking.rows}
                viewer={ranking.viewer}
                pageSize={PAGE_SIZE}
                empty="Ninguém pontuou ainda. Registre sua última prova e saia na frente."
              />
            </div>
            <div className="flex flex-col lg:col-span-2">
              <h3 className="mb-3 font-display text-xl font-bold uppercase">
                Minhas corridas
              </h3>
              <MyClaims claims={claims} />
            </div>
          </div>
        </section>

        <section
          id="registrar"
          className="grid scroll-mt-20 gap-8 rounded-3xl bg-white p-6 ring-1 ring-asfalto-100 md:p-8 lg:grid-cols-3"
        >
          <div>
            <h2 className="font-display text-3xl font-bold uppercase">
              Registrar corrida
            </h2>
            <p className="mt-2 text-sm text-asfalto-500">
              Escolha a prova na lista ou informe a que você correu, e envie o
              comprovante. Valem provas a partir de {formatDateShort(since)}.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-asfalto-700">
              <li>✓ Tempo oficial e número de peito do resultado</li>
              <li>✓ Seu nome completo, como saiu no resultado</li>
              <li>✓ Link do resultado oficial ou da atividade no Strava</li>
            </ul>
          </div>
          <div className="lg:col-span-2">
            <RegisterRunForm
              races={options}
              today={brtDay(now)}
              earliest={brtDay(since)}
            />
          </div>
        </section>

        {flags.sorteiosAtivos && (
          <section>
            <SectionHeading
              title="Sorteios abertos"
              text="Participe com um clique. Quem é Premium concorre a todos."
            />
            <Raffles />
          </section>
        )}

        {flags.sorteiosAtivos && <Winners />}
      </div>
    </>
  );
}

async function Raffles() {
  const open = await getOpenRaffles();
  if (!open.length) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
        Nenhum sorteio aberto agora. Volte em breve.
      </p>
    );
  }
  const { viewer, entered } = await raffleViewer(open.map((r) => r.id));
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {open.map((r) => (
        <RaffleCard
          key={r.id}
          raffle={r}
          viewer={viewer}
          entered={entered.has(r.id)}
        >
          <p className="text-sm whitespace-pre-line text-asfalto-700">
            {r.description}
          </p>
        </RaffleCard>
      ))}
    </div>
  );
}

type MyClaim = {
  id: string;
  status: keyof typeof claimStatusLabels;
  points: number;
  distanceKm: number;
  reviewNote: string | null;
  finishSeconds: number | null;
  customRaceName: string | null;
  customRaceDate: Date | null;
  customCity: string | null;
  customState: string | null;
  race: { name: string; startsAt: Date; slug: string } | null;
};

const statusStyle: Record<MyClaim["status"], string> = {
  PENDENTE: "bg-asfalto-100 text-asfalto-700",
  APROVADA: "bg-pace-500 text-asfalto-950",
  RECUSADA: "bg-red-100 text-red-700",
};

/** Ranking e "Minhas corridas" mostram 10 por vez; o resto fica nas setas. */
const PAGE_SIZE = 10;

function MyClaims({ claims }: { claims: MyClaim[] }) {
  const count = (st: MyClaim["status"]) =>
    claims.filter((c) => c.status === st).length;
  // A lista cresce com o tempo: resumo no topo, 10 corridas por página e espaços vazios até completar.
  // As setas ficam fora do cartão, alinhadas com as do ranking ao lado.
  const summary = (
    <p className="flex flex-wrap gap-x-4 gap-y-1 border-b border-asfalto-100 px-3 py-2 text-xs text-asfalto-500">
      <span>
        <strong className="text-asfalto-950">{claims.length}</strong>{" "}
        {claims.length === 1 ? "corrida" : "corridas"}
      </span>
      <span>{count("APROVADA")} aprovadas</span>
      <span>{count("PENDENTE")} em análise</span>
      {count("RECUSADA") > 0 && (
        <span className="text-red-700">{count("RECUSADA")} recusadas</span>
      )}
    </p>
  );
  return (
    <Paged
      pages={chunk(claims, PAGE_SIZE).map((page, i) => (
        <div
          key={i}
          className="h-full overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100"
        >
          {summary}
          <ul className="divide-y divide-asfalto-100">
            {page.map((c) => {
              const info = claimRace(c);
              return (
                <li key={c.id} className="min-h-16 space-y-1 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    {info.slug ? (
                      <Link
                        href={`/corrida/${info.slug}`}
                        className="font-semibold hover:text-largada-600"
                      >
                        {info.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{info.name}</span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[c.status]}`}
                    >
                      {claimStatusLabels[c.status]}
                    </span>
                  </div>
                  <p className="text-asfalto-500">
                    {[
                      info.date && formatDateShort(info.date),
                      info.place,
                      formatDistance(c.distanceKm),
                      c.finishSeconds && formatFinishTime(c.finishSeconds),
                      `${c.points} pontos`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {c.status === "RECUSADA" && (
                    <p className="text-red-700">
                      {c.reviewNote ? `Motivo: ${c.reviewNote}. ` : ""}Você pode
                      enviar de novo pelo formulário.
                    </p>
                  )}
                </li>
              );
            })}
            {Array.from({ length: PAGE_SIZE - page.length }, (_, j) => (
              <li
                key={`vazio-${j}`}
                className="flex min-h-16 items-center p-3 text-sm text-asfalto-300"
              >
                {!claims.length && j === 0
                  ? "Você ainda não registrou nenhuma corrida."
                  : "—"}
              </li>
            ))}
          </ul>
        </div>
      ))}
      total={claims.length}
      pageSize={PAGE_SIZE}
      noun="Corridas"
    />
  );
}

async function Winners() {
  const drawn = await db.raffle.findMany({
    where: { status: "SORTEADO" },
    orderBy: { drawnAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      prize: true,
      winner: { select: { name: true } },
    },
  });
  if (!drawn.length) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-3xl font-bold uppercase">
        Últimos ganhadores
      </h2>
      <ul className="divide-y divide-asfalto-100 rounded-2xl bg-white text-sm ring-1 ring-asfalto-100">
        {drawn.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 p-3">
            <span>
              {r.title} <span className="text-asfalto-500">· {r.prize}</span>
            </span>
            {/* Só primeiro nome e inicial: o ganhador não precisa ter o nome completo exposto */}
            <span className="font-semibold">
              🏆 {r.winner ? publicName(r.winner.name) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Quem ainda não assina ---------- */

const steps = [
  { title: "Assine o Premium", text: `${price} por mês, no cartão ou no Pix.` },
  {
    title: "Corra suas provas",
    text: "Qualquer corrida de rua conta, do calendário ou não.",
  },
  {
    title: "Envie o comprovante",
    text: "Tempo oficial, número de peito e o link do resultado ou do Strava.",
  },
  {
    title: "Suba no ranking",
    text: `${pontos.porProva} pontos por prova + ${pontos.porKm} por km.${temporada.premio ? " O 1º da temporada leva o prêmio." : ""}`,
  },
];

/** Posições do ranking na página de venda: as vazias aparecem como vaga livre, e a tabela acompanha a altura dos prêmios. */
const SALES_RANKING_SIZE = 10;

/** Página de venda: o prêmio da temporada, como funciona, o ranking ao vivo e os prêmios dos sorteios. */
async function SalesPage({ loggedIn }: { loggedIn: boolean }) {
  const now = new Date();
  const season = seasonOf(now);
  const { rows } = await getPointsRanking(null, season, SALES_RANKING_SIZE, { demo: true });
  const left = daysLeft(season, now);
  // Próxima posição livre no top 10, usada no convite embaixo da tabela
  const nextFree = rows.length < SALES_RANKING_SIZE ? rows.length + 1 : null;
  const ends = formatDateShort(lastDay(season));

  return (
    <>
      <section className="relative overflow-hidden bg-asfalto-950 text-white">
        <div
          className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90"
          aria-hidden
        />
        <div
          className="absolute -top-24 right-0 h-96 w-1/2 rounded-full bg-largada-500/15 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-16 md:pt-16 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            {/* Uma palavra por linha, sem pontuação: lê como placa de largada */}
            <h1 className="font-display text-7xl leading-[0.85] font-extrabold italic uppercase md:text-8xl">
              <span className="block">Corra</span>
              <span className="block">Pontue</span>
              <span className="block text-largada-500">Ganhe</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-asfalto-300">
              Cada prova que você corre vira pontos no ranking da temporada.
              {temporada.premio && ` Quem terminar em 1º leva ${temporada.premio}.`}{" "}
              Assinantes concorrem aos sorteios de prêmios.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#plano"
                className="rounded-xl bg-largada-500 px-6 py-3 font-semibold text-asfalto-950 hover:bg-largada-600"
              >
                Quero concorrer por {price}/mês
              </a>
              <a
                href="#ranking"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                Ver o ranking
              </a>
            </div>
          </div>

          {/* Cartão do prêmio: tipográfico; com foto configurada, ela aparece acima do nome */}
          <figure className="rounded-3xl bg-gradient-to-br from-asfalto-800 to-asfalto-900 p-8 ring-1 ring-white/10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-asfalto-950">
              <span aria-hidden>👑</span> {temporada.premio ? "Prêmio do 1º lugar" : "Ranking aberto"}
            </span>
            {temporada.premio && temporada.premioImagem && (
              <PrizeShoe className="mx-auto mt-6 h-48 w-full max-w-sm" />
            )}
            <figcaption>
              <p className="mt-6 font-display text-6xl leading-[0.85] font-extrabold uppercase first-letter:uppercase md:text-7xl">
                {temporada.premio ? (
                  temporada.premio.replace(/^(um|uma) /, "")
                ) : (
                  <>
                    Dispute
                    <span className="block text-asfalto-300">o topo</span>
                  </>
                )}
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <dt className="text-xs text-asfalto-300">Temporada</dt>
                  <dd className="mt-1 font-display text-xl font-bold">
                    {season.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-asfalto-300">Termina em</dt>
                  <dd className="mt-1 font-display text-xl font-bold">
                    {ends}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-asfalto-300">Faltam</dt>
                  <dd className="mt-1 font-display text-xl font-bold text-pace-500 tabular-nums">
                    {left === 0
                      ? "último dia"
                      : `${left} ${left === 1 ? "dia" : "dias"}`}
                  </dd>
                </div>
              </dl>
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
        <section>
          <SectionHeading
            title="Como funciona"
            text="Do pagamento ao pódio, em quatro passos."
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-asfalto-100"
              >
                <span className="font-display text-4xl leading-none font-extrabold text-largada-500 tabular-nums">
                  {i + 1}
                </span>
                <p className="mt-3 font-semibold">{step.title}</p>
                <p className="mt-1 text-sm text-asfalto-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="ranking"
          className="grid scroll-mt-20 gap-8 lg:grid-cols-5"
        >
          <div className="flex flex-col lg:col-span-3">
            <SectionHeading
              title="Ranking da temporada"
              text="Os 10 primeiros agora. No empate, vence quem correu mais km."
            />
            <RankingTable
              rows={rows}
              pageSize={SALES_RANKING_SIZE}
              pager={false}
              empty={
                <>
                  Ninguém pontuou ainda nesta temporada. A 1ª posição está
                  livre.{" "}
                  <a
                    href="#plano"
                    className="font-semibold text-largada-600 hover:underline"
                  >
                    Assine e entre na disputa
                  </a>
                  .
                </>
              }
              footer={
                nextFree && (
                  <p className="text-asfalto-500">
                    A {nextFree}ª posição está livre.{" "}
                    <a
                      href="#plano"
                      className="font-semibold text-largada-600 hover:underline"
                    >
                      Assine e entre na disputa
                    </a>
                    .
                  </p>
                )
              }
            />
          </div>
          {/* Tipos de prêmio, e não os sorteios abertos agora: até a pessoa assinar, um deles já pode ter sido sorteado */}
          <div className="flex flex-col lg:col-span-2">
            <SectionHeading
              title="Prêmios dos sorteios"
              text="Os sorteios mudam ao longo da temporada. Estes são os prêmios que sorteamos."
            />
            <ul className="grid flex-1 grid-cols-2 grid-rows-[1fr_auto] gap-3">
              <li className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100">
                <BibPrize />
                <p className="border-t border-asfalto-100 p-4 font-display text-lg leading-tight font-bold uppercase">
                  Inscrições em corridas
                  <span className="mt-0.5 block font-sans text-sm font-normal text-asfalto-500 normal-case">
                    Provas escolhidas pelo Largadia
                  </span>
                </p>
              </li>
              <li className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100">
                <div className="grid min-h-32 flex-1 place-items-center bg-asfalto-50 p-4" aria-hidden>
                  <PrizeShoe className="w-full max-w-44" />
                </div>
                <p className="border-t border-asfalto-100 p-4 font-display text-lg leading-tight font-bold uppercase">
                  Tênis de corrida
                  <span className="mt-0.5 block font-sans text-sm font-normal text-asfalto-500 normal-case">
                    E outros itens para correr
                  </span>
                </p>
              </li>
              <li className="col-span-2 rounded-2xl bg-asfalto-950 p-5 text-sm text-asfalto-300">
                <p className="font-display text-lg font-bold text-white uppercase">Como participar</p>
                <p className="mt-1">
                  Os sorteios abertos ficam na área Premium e você entra com um clique. Só concorre quem está com o Premium ativo,
                  e quem ganha espera {sorteios.carenciaGanhadorDias} dias para ganhar de novo.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section id="plano" className="scroll-mt-20">
          <SectionHeading
            title="O que você ganha"
            text="Tudo isso por um valor fixo por mês."
          />
          <div className="grid gap-6 md:grid-cols-[1fr_22rem]">
            <ul className="grid auto-rows-fr gap-4">
              {perks.map((p) => (
                <li
                  key={p.title}
                  className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-asfalto-100"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pace-500 font-bold text-asfalto-950"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-sm text-asfalto-500">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="flex flex-col rounded-2xl bg-white p-6 ring-2 ring-largada-500">
              <p className="text-sm font-semibold text-asfalto-500">
                Plano mensal
              </p>
              <p className="mt-1 font-display text-5xl font-extrabold">
                {price}
                <span className="text-lg font-semibold text-asfalto-500">
                  /mês
                </span>
              </p>
              <div className="mt-5">
                <Cta loggedIn={loggedIn} />
              </div>
              <p className="mt-4 text-xs text-asfalto-500">
                Pagamento processado com segurança pelo Stripe.
              </p>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}

/** Número de peito desenhado, para o prêmio de inscrição grátis. */
function BibPrize() {
  return (
    <div
      className="grid min-h-32 flex-1 place-items-center bg-asfalto-50 p-4"
      aria-hidden
    >
      <div className="w-4/5 -rotate-3 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-asfalto-100">
        <p className="bg-largada-500 px-2 py-1 text-center font-display text-xs font-bold whitespace-nowrap text-asfalto-950 uppercase">
          Inscrição grátis
        </p>
        <p className="py-3 text-center font-display text-5xl leading-none font-extrabold tabular-nums">
          001
        </p>
        {/* Furos do alfinete nos cantos */}
        <div className="flex justify-between px-2 pb-2">
          <span className="size-2 rounded-full bg-asfalto-100" />
          <span className="size-2 rounded-full bg-asfalto-100" />
        </div>
      </div>
    </div>
  );
}

/** Título de seção da página de venda, sempre com a mesma escala e espaçamento. */
function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      <p className="mt-1 text-sm text-asfalto-500">{text}</p>
    </div>
  );
}

/** Botão de forma de pagamento: ícone numa caixa do mesmo tamanho, nome e uma linha explicando a cobrança. */
function PayButton({
  className,
  style,
  icon,
  iconBox,
  title,
  hint,
  hintClass,
}: {
  className: string;
  style?: React.CSSProperties;
  icon: React.ReactNode;
  iconBox: string;
  title: string;
  hint: string;
  hintClass: string;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${className}`}
      style={style}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${iconBox}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className={`block text-xs ${hintClass}`}>{hint}</span>
      </span>
    </button>
  );
}

/** Visitante cria conta; quem já tem conta escolhe cartão ou Pix. */
function Cta({ loggedIn }: { loggedIn: boolean }) {
  const button =
    "block w-full rounded-xl bg-largada-500 px-5 py-3 text-center font-semibold text-asfalto-950 hover:bg-largada-600";
  if (!loggedIn) {
    return (
      <div className="space-y-2">
        <Link href="/cadastro" className={button}>
          Criar conta e assinar
        </Link>
        <Link
          href="/entrar?voltar=/assinatura"
          className="block text-center text-sm text-largada-600 hover:underline"
        >
          Já tenho conta
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <form action={assinar}>
        <PayButton
          className="bg-asfalto-950 text-white hover:bg-asfalto-800"
          icon={<CardIcon className="size-5" />}
          iconBox="bg-white/10"
          title="Assinatura"
          hint="Renova sozinha, sem fidelidade"
          hintClass="text-asfalto-300"
        />
      </form>
      {PIX_PLANS.map((plan) => (
        <form key={plan.id} action={assinarPix.bind(null, plan.id)}>
          <PayButton
            className="text-asfalto-950 hover:brightness-95"
            style={{ backgroundColor: PIX_GREEN }}
            icon={<PixIcon className="size-5" />}
            iconBox="bg-white/35"
            title={`Pix pré-pago · ${plan.label}`}
            hint="Paga uma vez, não renova sozinho"
            hintClass="text-asfalto-800"
          />
        </form>
      ))}
    </div>
  );
}
