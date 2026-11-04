import "server-only";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PIX_STATUS, subscriptionFields } from "./status";

/** Prioridade quando o cliente tem mais de uma assinatura: a que dá acesso vence a cancelada. */
const RANK: Record<string, number> = { active: 0, trialing: 1, past_due: 2, unpaid: 3, incomplete: 4, paused: 5, canceled: 6, incomplete_expired: 7 };
const GIVES_ACCESS = new Set(["active", "trialing", "past_due"]);

/**
 * Busca no Stripe a assinatura de cartão do cliente e grava no banco. Complementa o webhook:
 * garante o status certo ao voltar do Checkout ou do portal, mesmo se o webhook atrasar
 * (ou, no computador local, se o `stripe listen` não estiver rodando).
 * Um período Pix pago só é substituído por uma assinatura de cartão que dê acesso.
 */
export async function syncSubscription(userId: string, customerId: string) {
  const [{ data }, user] = await Promise.all([
    stripe().subscriptions.list({ customer: customerId, status: "all", limit: 10 }),
    db.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  const current = [...data].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || b.created - a.created)[0];
  if (user.subscriptionStatus === PIX_STATUS && !(current && GIVES_ACCESS.has(current.status))) return user;
  const fields = current
    ? subscriptionFields(current)
    : { stripeSubscriptionId: null, subscriptionStatus: null, subscriptionEndsAt: null };
  return db.user.update({ where: { id: userId }, data: fields });
}
