import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Cliente do Stripe. Falha com mensagem clara se a chave não estiver no .env. */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não definida no .env.");
  client ??= new Stripe(key);
  return client;
}

let resolvedPrice: string | null = null;

/** Preço da assinatura. Aceita o ID do preço (price_...) ou do produto (prod_...), usando o preço padrão do produto. */
export async function stripePriceId(): Promise<string> {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRICE_ID não definido no .env.");
  if (!id.startsWith("prod_")) return id;
  if (resolvedPrice) return resolvedPrice;
  const product = await stripe().products.retrieve(id);
  const price = typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
  if (!price) throw new Error(`O produto ${id} não tem preço padrão no Stripe.`);
  resolvedPrice = price;
  return price;
}
