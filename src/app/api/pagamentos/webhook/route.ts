import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PIX_STATUS, subscriptionFields } from "@/domain/assinatura/status";
import { grantPixPayment, revokePixPayment } from "@/domain/assinatura/pix";

/**
 * Webhook do Stripe: é daqui, e não do retorno do Checkout, que vem a confirmação do pagamento.
 * Eventos usados: checkout.session.completed, checkout.session.async_payment_succeeded (Pix)
 * customer.subscription.created/updated/deleted e charge.refunded (reembolso de Pix).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook não configurado", { status: 400 });

  let event: Stripe.Event;
  try {
    // A assinatura é conferida sobre o corpo cru, antes de qualquer parse
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // Pix: o "completed" chega antes do pagamento; o "async_payment_succeeded", quando o QR é pago
      if (session.mode === "payment") {
        await grantPixPayment(session);
        break;
      }
      if (session.mode !== "subscription" || !session.client_reference_id || typeof session.subscription !== "string") break;
      const sub = await stripe().subscriptions.retrieve(session.subscription);
      await db.user.updateMany({
        where: { id: session.client_reference_id },
        data: { stripeCustomerId: String(session.customer), ...subscriptionFields(sub) },
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Os eventos podem chegar fora de ordem: vale o estado atual no Stripe, não o que veio no evento
      const sub =
        event.type === "customer.subscription.deleted"
          ? event.data.object
          : await stripe().subscriptions.retrieve(event.data.object.id);
      // Assinatura de cartão encerrada não derruba um período Pix já pago
      const givesAccess = ["active", "trialing", "past_due"].includes(sub.status);
      await db.user.updateMany({
        where: { stripeCustomerId: String(sub.customer), ...(givesAccess ? {} : { NOT: { subscriptionStatus: PIX_STATUS } }) },
        data: subscriptionFields(sub),
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      // Só reembolso total tira o período; parcial é um acerto de valor
      const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (charge.refunded && intent) await revokePixPayment(intent);
      break;
    }
  }
  return new Response(null, { status: 200 });
}
