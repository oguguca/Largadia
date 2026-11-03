"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { stripe, stripePriceId } from "@/lib/stripe";
import { isPremium, PIX_STATUS } from "@/domain/assinatura/status";
import { PIX_KIND } from "@/domain/assinatura/pix";
import { PIX_PLANS, type PixPlanId } from "@/config/assinatura";

/** Cliente do Stripe do usuário, criado na primeira assinatura. */
async function customerId(user: { id: string; name: string; email: string; stripeCustomerId: string | null }) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({ name: user.name, email: user.email, metadata: { userId: user.id } });
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Abre o Checkout do Stripe. O acesso só é liberado quando o webhook confirmar o pagamento. */
export async function assinar() {
  const user = await requireUser("/conta");
  if (isPremium(user)) redirect("/conta");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerId(user),
    client_reference_id: user.id,
    line_items: [{ price: await stripePriceId(), quantity: 1 }],
    locale: "pt-BR",
    allow_promotion_codes: true,
    success_url: `${siteUrl}/conta?assinatura=ok`,
    cancel_url: `${siteUrl}/conta?assinatura=cancelada`,
  });
  redirect(session.url!);
}

/**
 * Abre o Checkout de Pix para um período pré-pago. Quem tem assinatura de cartão ativa não precisa;
 * quem já tem Pix ativo pode renovar antes de vencer, e o período novo soma ao atual.
 */
export async function assinarPix(planId: PixPlanId) {
  const user = await requireUser("/conta");
  const plan = PIX_PLANS.find((p) => p.id === planId);
  if (!plan) redirect("/assinatura");
  if (isPremium(user) && user.subscriptionStatus !== PIX_STATUS) redirect("/conta");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    allowed_payment_method_types: ["pix"],
    payment_method_options: { pix: { expires_after_seconds: 60 * 60 } },
    customer: await customerId(user),
    client_reference_id: user.id,
    line_items: [
      {
        quantity: 1,
        price_data: { currency: "brl", unit_amount: plan.cents, product_data: { name: `Largadia Premium · ${plan.label} (Pix)` } },
      },
    ],
    metadata: { kind: PIX_KIND, userId: user.id, months: String(plan.months) },
    locale: "pt-BR",
    success_url: `${siteUrl}/conta?pix={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/conta?assinatura=cancelada`,
  });
  redirect(session.url!);
}

/** Portal do Stripe: trocar cartão, ver faturas e cancelar. */
export async function gerenciarAssinatura() {
  const user = await requireUser("/conta");
  if (!user.stripeCustomerId) redirect("/conta");
  const portal = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${siteUrl}/conta` });
  redirect(portal.url);
}

export async function sair() {
  await signOut({ redirectTo: "/" });
}
