/** Preço do Largadia Premium em centavos. Precisa bater com o preço padrão do produto no Stripe. */
export const PREMIUM_PRICE_CENTS = 1499;

/** Períodos pré-pagos por Pix (o Stripe não tem Pix recorrente no Brasil). Para oferecer mais, acrescente aqui. */
export const PIX_PLANS = [{ id: "1m", months: 1, cents: 1499, label: "1 mês" }] as const;

export type PixPlanId = (typeof PIX_PLANS)[number]["id"];
