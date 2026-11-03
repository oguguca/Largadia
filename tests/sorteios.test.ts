import { describe, expect, it } from "vitest";
import { cooldownDaysLeft, drawBlockReason, entryBlockReason, participantStatus, pickWinner, raffleSchema } from "@/domain/sorteios/sorteio";

const now = new Date("2026-11-10T12:00:00Z");
const open = { status: "ABERTO" as const, entriesCloseAt: new Date("2026-11-20T12:00:00Z"), premiumOnly: true };

describe("sorteios", () => {
  it("valida o formulário e converte o prazo para Brasília", () => {
    const r = raffleSchema.parse({
      title: "Inscrição na Meia de SP",
      prize: "1 inscrição de 21 km",
      description: "Sorteio de uma inscrição para assinantes.",
      closeDate: "2026-11-20",
      closeTime: "23:59",
      premiumOnly: "on",
      status: "ABERTO",
    });
    expect(r.entriesCloseAt?.toISOString()).toBe("2026-11-21T02:59:00.000Z");
    expect(r.premiumOnly).toBe(true);
    expect(raffleSchema.safeParse({ ...r, status: "SORTEADO" }).success).toBe(false);
  });

  it("aceita sorteio sem data quando o admin encerra manualmente", () => {
    const base = { title: "Tênis", prize: "Tênis de corrida", description: "Sorteio de um tênis para assinantes.", status: "ABERTO" };
    expect(raffleSchema.parse({ ...base, manualClose: "on", closeDate: "", closeTime: "" }).entriesCloseAt).toBeNull();
    expect(raffleSchema.safeParse({ ...base, closeDate: "", closeTime: "" }).success).toBe(false);
  });

  it("sem data: aceita participações até o admin encerrar e só sorteia depois", () => {
    const manual = { ...open, entriesCloseAt: null };
    expect(entryBlockReason(manual, { premium: true }, now)).toBeNull();
    expect(drawBlockReason({ ...manual, winnerId: null }, 5, now)).toMatch(/Encerrar participações/);
    expect(drawBlockReason({ ...manual, status: "ENCERRADO", winnerId: null }, 5, now)).toBeNull();
    expect(entryBlockReason({ ...manual, status: "ENCERRADO" }, { premium: true }, now)).toMatch(/não está aceitando/);
  });

  it("explica por que o corredor não pode participar", () => {
    expect(entryBlockReason(open, { premium: true }, now)).toBeNull();
    expect(entryBlockReason(open, { premium: false }, now)).toMatch(/Premium/);
    expect(entryBlockReason(open, null, now)).toMatch(/Entre/);
    expect(entryBlockReason({ ...open, entriesCloseAt: now }, { premium: true }, now)).toMatch(/encerradas/);
    // Só Premium ativo pode ganhar, então quem não assina também não entra (mesmo em sorteio antigo sem a marca)
    expect(entryBlockReason({ ...open, premiumOnly: false }, { premium: false }, now)).toMatch(/Premium/);
  });

  it("só sorteia após o prazo, com participantes e uma única vez", () => {
    expect(drawBlockReason({ ...open, winnerId: null }, 3, now)).toMatch(/abertas/);
    expect(drawBlockReason({ ...open, status: "ENCERRADO", winnerId: null }, 3, now)).toBeNull();
    expect(drawBlockReason({ ...open, entriesCloseAt: now, winnerId: null }, 0, now)).toMatch(/Ninguém/);
    expect(drawBlockReason({ ...open, status: "SORTEADO", winnerId: "u1" }, 3, now)).toMatch(/ganhador/);
  });

  it("escolhe pela posição sorteada", () => {
    expect(pickWinner(["a", "b", "c"], () => 2)).toBe("c");
    expect(() => pickWinner([], () => 0)).toThrow();
  });
});

describe("situação do participante", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const fechaEm = { entriesCloseAt: new Date("2026-11-30T12:00:00Z") };
  it("Assinante quando o Premium cobre o sorteio", () => {
    expect(participantStatus({ subscriptionStatus: "active", subscriptionEndsAt: new Date("2026-12-01T00:00:00Z") }, fechaEm, now)).toBe("ASSINANTE");
    expect(participantStatus({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-12-05T00:00:00Z") }, fechaEm, now)).toBe("ASSINANTE");
  });
  it("Renovar quando o Pix vence antes do fim das participações ou o cartão atrasou", () => {
    expect(participantStatus({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-20T00:00:00Z") }, fechaEm, now)).toBe("RENOVAR");
    expect(participantStatus({ subscriptionStatus: "past_due", subscriptionEndsAt: new Date("2026-11-11T00:00:00Z") }, fechaEm, now)).toBe("RENOVAR");
    // Sem data de encerramento: avisa quem vence em até 7 dias
    expect(participantStatus({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-14T00:00:00Z") }, { entriesCloseAt: null }, now)).toBe("RENOVAR");
  });
  it("Expirado sem Premium agora", () => {
    expect(participantStatus({ subscriptionStatus: "pix", subscriptionEndsAt: new Date("2026-11-01T00:00:00Z") }, fechaEm, now)).toBe("EXPIRADO");
    expect(participantStatus({ subscriptionStatus: "canceled", subscriptionEndsAt: null }, fechaEm, now)).toBe("EXPIRADO");
    expect(participantStatus({ subscriptionStatus: null, subscriptionEndsAt: null }, fechaEm, now)).toBe("EXPIRADO");
  });
});

describe("carência de quem ganhou", () => {
  const raffle = { status: "ABERTO" as const, entriesCloseAt: null, premiumOnly: true };
  const now = new Date("2026-11-10T12:00:00Z");
  it("bloqueia quem ganhou há menos de 60 dias e libera depois", () => {
    expect(entryBlockReason(raffle, { premium: true, lastWinAt: new Date("2026-10-01T12:00:00Z") }, now)).toMatch(/ganhou um sorteio/);
    expect(entryBlockReason(raffle, { premium: true, lastWinAt: new Date("2026-08-01T12:00:00Z") }, now)).toBeNull();
    expect(cooldownDaysLeft(new Date("2026-10-01T12:00:00Z"), now)).toBe(20);
    expect(cooldownDaysLeft(null, now)).toBe(0);
  });
});
