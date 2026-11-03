import { describe, expect, it } from "vitest";
import { daysLeft, previousSeason, rankTotals, seasonOf } from "@/domain/pontos/temporada";
import { claimBlockReason } from "@/domain/pontos/pontos";

describe("temporadas de 3 meses", () => {
  it("usa os trimestres do calendário, em horário de Brasília", () => {
    const s = seasonOf(new Date("2026-10-31T12:00:00Z"));
    expect(s.label).toBe("out–dez 2026");
    expect(s.end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(seasonOf(new Date("2027-04-15T12:00:00Z")).start.toISOString()).toBe("2027-04-01T03:00:00.000Z");
    // 31/12 às 23h em Brasília ainda é a temporada de out–dez
    expect(seasonOf(new Date("2027-01-01T02:00:00Z")).id).toBe("2026-4");
    expect(seasonOf(new Date("2027-01-01T03:00:00Z")).label).toBe("jan–mar 2027");
  });

  it("acha a temporada anterior e conta os dias que faltam", () => {
    const s = seasonOf(new Date("2027-02-10T12:00:00Z"));
    expect(previousSeason(s)?.label).toBe("out–dez 2026");
    expect(daysLeft(s, new Date("2027-03-31T12:00:00Z"))).toBe(0);
    expect(daysLeft(s, new Date("2027-03-30T12:00:00Z"))).toBe(1);
  });

  it("fecha as comprovações de uma temporada 7 dias depois do fim", () => {
    const race = { startsAt: new Date("2026-12-20T10:00:00Z"), distancesKm: [10] };
    const premium = { premium: true };
    expect(claimBlockReason(race, premium, null, new Date("2027-01-05T12:00:00Z"))).toBeNull();
    expect(claimBlockReason(race, premium, null, new Date("2027-01-09T12:00:00Z"))).toMatch(/já fechou/);
  });
});

describe("primeira temporada (out–dez 2026)", () => {
  it("recebe as provas de antes dela e não tem temporada anterior", () => {
    const first = seasonOf(new Date("2026-11-10T12:00:00Z"));
    expect(seasonOf(new Date("2026-09-15T12:00:00Z")).id).toBe(first.id);
    expect(first.start.getTime()).toBe(0);
    expect(previousSeason(first)).toBeNull();
  });
});

describe("ordem do ranking", () => {
  it("desempata pelos km e divide a posição só no empate total", () => {
    const ranked = rankTotals([
      { userId: "a", points: 30, races: 2, km: 20 },
      { userId: "b", points: 30, races: 1, km: 25 },
      { userId: "c", points: 15, races: 1, km: 10 },
      { userId: "d", points: 15, races: 1, km: 10 },
    ]);
    expect(ranked.map((r) => [r.userId, r.position])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 3],
      ["d", 3],
    ]);
  });
});
