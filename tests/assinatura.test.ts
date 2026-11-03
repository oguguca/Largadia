import { describe, expect, it } from "vitest";
import { addMonths, isPremium, pixValidUntil, subscriptionFields } from "@/domain/assinatura/status";

describe("assinatura Premium", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("libera acesso para status ativos dentro do período", () => {
    expect(isPremium({ subscriptionStatus: "active", subscriptionEndsAt: new Date("2026-12-01T00:00:00Z") }, now)).toBe(true);
    expect(isPremium({ subscriptionStatus: "past_due", subscriptionEndsAt: new Date("2026-12-01T00:00:00Z") }, now)).toBe(true);
  });

  it("bloqueia cancelada, sem assinatura ou período vencido há mais de um dia", () => {
    expect(isPremium({ subscriptionStatus: "canceled", subscriptionEndsAt: new Date("2026-12-01T00:00:00Z") }, now)).toBe(false);
    expect(isPremium({ subscriptionStatus: null, subscriptionEndsAt: null }, now)).toBe(false);
    expect(isPremium({ subscriptionStatus: "active", subscriptionEndsAt: new Date("2026-11-08T00:00:00Z") }, now)).toBe(false);
    expect(isPremium({ subscriptionStatus: "active", subscriptionEndsAt: new Date("2026-11-10T00:00:00Z") }, now)).toBe(true);
  });

  it("lê o fim do período nos itens da assinatura", () => {
    expect(
      subscriptionFields({ id: "sub_1", status: "active", items: { data: [{ current_period_end: 1_796_000_000 }] } }),
    ).toEqual({ stripeSubscriptionId: "sub_1", subscriptionStatus: "active", subscriptionEndsAt: new Date(1_796_000_000_000) });
  });
});

describe("Premium por Pix", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("bloqueia no instante em que o período acaba, sem folga", () => {
    expect(isPremium({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-10T12:00:01Z") }, now)).toBe(true);
    expect(isPremium({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-10T11:59:59Z") }, now)).toBe(false);
    expect(isPremium({ subscriptionStatus: "pix", subscriptionEndsAt: null }, now)).toBe(false);
  });

  it("renovação antes de vencer soma ao período atual; vencido conta a partir de hoje", () => {
    const active = { subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-20T12:00:00Z") };
    expect(pixValidUntil(active, 1, now).toISOString()).toBe("2026-12-20T12:00:00.000Z");
    const expired = { subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-01T12:00:00Z") };
    expect(pixValidUntil(expired, 1, now).toISOString()).toBe("2026-12-10T12:00:00.000Z");
    expect(pixValidUntil({ subscriptionStatus: "canceled", subscriptionEndsAt: null }, 1, now).toISOString()).toBe("2026-12-10T12:00:00.000Z");
  });

  it("soma meses respeitando o fim do mês", () => {
    expect(addMonths(new Date("2027-01-31T10:00:00Z"), 1).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(addMonths(new Date("2026-11-15T10:00:00Z"), 12).toISOString()).toBe("2027-11-15T10:00:00.000Z");
  });
});
