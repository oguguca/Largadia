/** Status do Stripe que dão acesso ao Premium. past_due mantém o acesso enquanto o Stripe tenta cobrar de novo. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SubscriptionFields = {
  stripeSubscriptionId: string;
  subscriptionStatus: string;
  subscriptionEndsAt: Date | null;
};

/** Status gravado para período pré-pago por Pix. */
export const PIX_STATUS = "pix";

/** O usuário tem Premium agora? */
export function isPremium(user: { subscriptionStatus: string | null; subscriptionEndsAt: Date | null }, now = new Date()): boolean {
  // Pix é pré-pago: acabou o período, acabou o acesso, sem folga
  if (user.subscriptionStatus === PIX_STATUS) return !!user.subscriptionEndsAt && user.subscriptionEndsAt.getTime() > now.getTime();
  if (!user.subscriptionStatus || !ACTIVE_STATUSES.has(user.subscriptionStatus)) return false;
  // Folga de um dia para o webhook de renovação do cartão chegar
  return !user.subscriptionEndsAt || user.subscriptionEndsAt.getTime() + 86_400_000 > now.getTime();
}

/** Soma meses no calendário, mantendo o dia (31/01 + 1 mês = 28 ou 29/02). */
export function addMonths(date: Date, months: number): Date {
  // A conta é feita no dia de Brasília: um Pix pago às 22h do dia 30 vence no dia 30 do mês seguinte, não no 29
  const shift = 3 * 3600_000;
  const d = new Date(date.getTime() - shift);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return new Date(d.getTime() + shift);
}

/** Novo fim do Premium após um Pix: renovar antes de vencer soma ao período atual, não perde dias. */
export function pixValidUntil(user: { subscriptionStatus: string | null; subscriptionEndsAt: Date | null }, months: number, now = new Date()): Date {
  const activePix = user.subscriptionStatus === PIX_STATUS && user.subscriptionEndsAt && user.subscriptionEndsAt > now;
  return addMonths(activePix ? user.subscriptionEndsAt! : now, months);
}

/** Campos do banco a partir da assinatura do Stripe (o fim do período fica nos itens desde a API 2025-03). */
export function subscriptionFields(sub: {
  id: string;
  status: string;
  items: { data: { current_period_end: number }[] };
}): SubscriptionFields {
  const ends = Math.max(0, ...sub.items.data.map((i) => i.current_period_end));
  return {
    stripeSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    subscriptionEndsAt: ends ? new Date(ends * 1000) : null,
  };
}

export const statusLabels: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  unpaid: "Não paga",
  incomplete: "Aguardando pagamento",
  incomplete_expired: "Expirada",
  paused: "Pausada",
  pix: "Pix (pré-pago)",
};
