import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { addMonths, PIX_STATUS, pixValidUntil } from "./status";

export const PIX_KIND = "premium_pix";

/**
 * Libera o período Premium de um Checkout Pix pago. Pode ser chamado pelo webhook e pela volta do
 * Checkout ao mesmo tempo: o id da sessão é a chave do PixPayment, então só a primeira chamada libera.
 * Devolve true se o pagamento está liberado (agora ou antes).
 */
export async function grantPixPayment(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== "payment" || session.metadata?.kind !== PIX_KIND) return false;
  if (session.payment_status !== "paid") return false;
  const userId = session.metadata.userId;
  const months = Number(session.metadata.months);
  if (!userId || !Number.isInteger(months) || months < 1) return false;

  try {
    await db.$transaction(async (tx) => {
      // Trava a linha do usuário: dois Pix diferentes pagos juntos somam os dois períodos, em vez de um sobrescrever o outro
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionStatus: true, subscriptionEndsAt: true } });
      const validUntil = pixValidUntil(user, months);
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      await tx.pixPayment.create({
        data: { id: session.id, userId, months, amountCents: session.amount_total ?? 0, validUntil, paymentIntentId },
      });
      await tx.user.update({ where: { id: userId }, data: { subscriptionStatus: PIX_STATUS, subscriptionEndsAt: validUntil } });
    });
  } catch (e) {
    // Já liberado por outra chamada
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return true;
    throw e;
  }
  return true;
}

/**
 * Reembolso total de um Pix: desconta do Premium os meses daquele pagamento.
 * Se o período já tinha passado, nada muda. Chamar de novo para o mesmo pagamento não desconta duas vezes.
 */
export async function revokePixPayment(paymentIntentId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const payment = await tx.pixPayment.findUnique({ where: { paymentIntentId } });
    if (!payment || payment.refundedAt) return;
    await tx.$queryRaw`SELECT 1 FROM "User" WHERE id = ${payment.userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: payment.userId }, select: { subscriptionStatus: true, subscriptionEndsAt: true } });
    await tx.pixPayment.update({ where: { id: payment.id }, data: { refundedAt: new Date() } });
    // Só mexe no Premium que veio do Pix; um cartão assinado depois segue valendo
    if (user.subscriptionStatus !== PIX_STATUS || !user.subscriptionEndsAt) return;
    await tx.user.update({ where: { id: payment.userId }, data: { subscriptionEndsAt: addMonths(user.subscriptionEndsAt, -payment.months) } });
  });
}
