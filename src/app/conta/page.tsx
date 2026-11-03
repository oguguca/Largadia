import type { Metadata } from "next";
import { PIX_GREEN, PixIcon } from "@/components/pagamento/pix-icon";
import { CardIcon } from "@/components/pagamento/card-icon";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { formatDateShort } from "@/lib/format";
import { isPremium, PIX_STATUS, statusLabels } from "@/domain/assinatura/status";
import { grantPixPayment } from "@/domain/assinatura/pix";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/domain/assinatura/sync";
import { claimStatusLabels } from "@/domain/pontos/pontos";
import { seasonOf } from "@/domain/pontos/temporada";
import { db } from "@/lib/db";
import { assinar, assinarPix, gerenciarAssinatura, sair } from "./actions";
import { PIX_PLANS, PREMIUM_PRICE_CENTS } from "@/config/assinatura";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

const perks = ["Pontos a cada corrida no ranking da temporada", "Sorteios de prêmios só para assinantes", "Cupons de desconto em provas parceiras"];

export default function ContaPage(props: PageProps<"/conta">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-display text-3xl font-extrabold italic uppercase">Minha conta</h1>
      <Suspense fallback={<p className="text-asfalto-500">Carregando…</p>}>
        <Conta searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Conta({ searchParams }: { searchParams: PageProps<"/conta">["searchParams"] }) {
  let user = await requireUser("/conta");
  const { assinatura, pix } = await searchParams;
  // Volta do Checkout de Pix: confere a sessão no Stripe e libera o período, sem depender do webhook
  let pixStatus: "pago" | "aguardando" | null = null;
  if (typeof pix === "string" && pix.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(pix);
      if (session.metadata?.userId === user.id) {
        pixStatus = (await grantPixPayment(session)) ? "pago" : "aguardando";
        user = await requireUser("/conta");
      }
    } catch {
      // Sessão inválida ou Stripe fora do ar: o webhook ainda libera quando o Pix for pago
    }
  }
  if (user.stripeCustomerId) {
    try {
      user = await syncSubscription(user.id, user.stripeCustomerId);
    } catch {
      // Stripe fora do ar: mostra o último status salvo
    }
  }
  const premium = isPremium(user);
  const viaPix = user.subscriptionStatus === PIX_STATUS;

  return (
    <div className="space-y-6">
      {(pixStatus === "pago" || (assinatura === "ok" && premium)) && (
        <p className="rounded-lg bg-pace-500/20 p-3 text-sm font-semibold">Bem-vindo ao Largadia Premium! 🎉</p>
      )}
      {assinatura === "ok" && !premium && (
        <p className="rounded-lg bg-pace-500/20 p-3 text-sm">
          Pagamento recebido! Estamos confirmando com o Stripe; recarregue a página em alguns segundos.
        </p>
      )}
      {pixStatus === "aguardando" && (
        <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
          Aguardando a confirmação do Pix. Assim que o pagamento cair, o Premium é liberado; recarregue esta página em instantes.
        </p>
      )}
      {assinatura === "cancelada" && <p className="rounded-lg bg-asfalto-100 p-3 text-sm">Pagamento não concluído. Nada foi cobrado.</p>}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-asfalto-500">{user.email}</p>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/admin" className="rounded-xl bg-asfalto-950 px-4 py-2 text-sm font-semibold text-white hover:bg-asfalto-800">
            Abrir painel de admin
          </Link>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl bg-asfalto-950 p-6 text-white">
        <p className="text-sm font-semibold tracking-widest text-pace-500 uppercase">Largadia Premium</p>
        {premium ? (
          <>
            <h2 className="mt-1 font-display text-3xl font-extrabold italic uppercase">Você é Premium</h2>
            <p className="mt-1 text-sm text-asfalto-300">
              {statusLabels[user.subscriptionStatus!] ?? user.subscriptionStatus}
              {user.subscriptionEndsAt && (viaPix ? ` · válido até ${formatDateShort(user.subscriptionEndsAt)}` : ` · renova em ${formatDateShort(user.subscriptionEndsAt)}`)}
            </p>
            {viaPix ? (
              <>
                <p className="mt-2 text-sm text-asfalto-300">Pix não renova sozinho. Renove antes do vencimento: os dias que faltam não se perdem.</p>
                <PixButtons label="Renovar com Pix" />
              </>
            ) : (
              <form action={gerenciarAssinatura} className="mt-4">
                <button className="rounded-xl bg-white px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-pace-500">Gerenciar assinatura</button>
              </form>
            )}
          </>
        ) : (
          <>
            {viaPix && user.subscriptionEndsAt ? (
              <h2 className="mt-1 font-display text-3xl font-extrabold italic uppercase">Seu Premium acabou</h2>
            ) : (
              <h2 className="mt-1 font-display text-3xl font-extrabold italic uppercase">Corra, pontue, ganhe</h2>
            )}
            {viaPix && user.subscriptionEndsAt && (
              <p className="mt-1 text-sm text-asfalto-300">
                O período pago por Pix terminou em {formatDateShort(user.subscriptionEndsAt)}. Assine de novo para voltar a ganhar pontos e
                participar dos sorteios.
              </p>
            )}
            <ul className="mt-3 space-y-1 text-asfalto-300">
              {perks.map((p) => (
                <li key={p}>✓ {p}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-start gap-3">
              <form action={assinar}>
                <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-asfalto-950 hover:bg-asfalto-100">
                  <CardIcon /> Assinatura · {brl(PREMIUM_PRICE_CENTS)}/mês
                </button>
                <span className="mt-1 block text-xs text-asfalto-300">Renova sozinho, cancele quando quiser</span>
              </form>
              <PixButtons label="Pix pré-pago" />
            </div>
            {user.stripeCustomerId && (
              <form action={gerenciarAssinatura} className="mt-3">
                <button className="text-sm text-asfalto-300 underline hover:text-white">Ver faturas anteriores</button>
              </form>
            )}
          </>
        )}
      </section>

      <Link
        href="/minhas-corridas"
        className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-asfalto-100 hover:ring-largada-500"
      >
        <span>
          <span className="block font-display text-xl font-bold uppercase">Minhas corridas</span>
          <span className="text-sm text-asfalto-500">Sua estante de provas corridas, com as suas avaliações.</span>
        </span>
        <span className="text-sm font-semibold text-largada-600">Abrir</span>
      </Link>

      <PointsSummary userId={user.id} />

      <form action={sair}>
        <button className="text-sm text-asfalto-500 hover:text-asfalto-900">Sair da conta</button>
      </form>
    </div>
  );
}

/** Saldo da temporada atual (só comprovações aprovadas) e histórico de "Eu corri". */
async function PointsSummary({ userId }: { userId: string }) {
  // Mesma regra do ranking: cada temporada começa do zero
  const season = seasonOf(new Date());
  const [total, claims] = await Promise.all([
    db.pointClaim.aggregate({
      where: { userId, status: "APROVADA", raceDate: { gte: season.start, lt: season.end } },
      _sum: { points: true },
    }),
    db.pointClaim.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { race: { select: { name: true, slug: true } } },
    }),
  ]);
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold uppercase">
          Meus pontos <span className="font-sans text-sm font-normal text-asfalto-500 normal-case">na temporada {season.label}</span>
        </h2>
        <p className="font-display text-4xl font-extrabold tabular-nums">{(total._sum.points ?? 0).toLocaleString("pt-BR")}</p>
      </div>
      {claims.length ? (
        <ul className="mt-3 divide-y divide-asfalto-100 text-sm">
          {claims.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
              {c.race ? (
                <Link href={`/corrida/${c.race.slug}`} className="hover:text-largada-600">
                  {c.race.name}
                </Link>
              ) : (
                <span>{c.customRaceName}</span>
              )}
              <span className={c.status === "APROVADA" ? "font-semibold" : "text-asfalto-500"}>
                {c.status === "APROVADA" ? `+${c.points}` : `${claimStatusLabels[c.status]} · ${c.points} pts`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-asfalto-500">
          Correu uma prova? Abra a página dela no Largadia e envie a comprovação em “Correu esta prova?” para ganhar pontos.
        </p>
      )}
    </section>
  );
}

/** Um botão por período Pix configurado em PIX_PLANS. */
function PixButtons({ label }: { label: string }) {
  return (
    <>
      {PIX_PLANS.map((plan) => (
        <form key={plan.id} action={assinarPix.bind(null, plan.id)}>
          <button
            className="flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-asfalto-950 hover:brightness-95"
            style={{ backgroundColor: PIX_GREEN }}
          >
            <PixIcon />
            {label} · {brl(plan.cents)} por {plan.label}
          </button>
          <span className="mt-1 block text-xs text-asfalto-300">Pagamento único, sem renovação automática</span>
        </form>
      ))}
    </>
  );
}
