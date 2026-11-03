import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { PIX_STATUS, pixValidUntil } from "./status";

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
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionStatus: true, subscriptionEndsAt: true } });
      const validUntil = pixValidUntil(user, months);
      await tx.pixPayment.create({ data: { id: session.id, userId, months, amountCents: session.amount_total ?? 0, validUntil } });
      await tx.user.update({ where: { id: userId }, data: { subscriptionStatus: PIX_STATUS, subscriptionEndsAt: validUntil } });
    });
  } catch (e) {
    // Já liberado por outra chamada
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return true;
    throw e;
  }
  return true;
}
