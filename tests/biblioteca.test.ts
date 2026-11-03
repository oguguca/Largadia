import { describe, expect, it } from "vitest";
import { hasStarted, runLogData, runLogSchema, shelfStats, summarizeRatings } from "@/domain/biblioteca/biblioteca";

describe("runLogSchema", () => {
  it("aceita tudo em branco: a corrida entra na estante sem avaliação", () => {
    const r = runLogSchema.parse({ distanceKm: "", finishTime: "", rating: "", comment: "" });
    expect(runLogData(r)).toMatchObject({ distanceKm: null, finishSeconds: null, rating: null, comment: null });
  });

  it("lê distância, tempo e notas", () => {
    const r = runLogSchema.parse({ distanceKm: "10", finishTime: "52:30", rating: "4", ratingKit: "2", comment: " Boa! " });
    expect(runLogData(r)).toMatchObject({ distanceKm: 10, finishSeconds: 3150, rating: 4, ratingKit: 2, ratingCourse: null, comment: "Boa!" });
  });

  it("pede a nota geral quando há comentário ou critério", () => {
    const r = runLogSchema.safeParse({ comment: "Ótima" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["rating"]);
    expect(runLogSchema.safeParse({ ratingCourse: "5" }).success).toBe(false);
  });

  it("aceita meia estrela", () => {
    expect(runLogData(runLogSchema.parse({ rating: "4.5", ratingKit: "0.5" }))).toMatchObject({ rating: 4.5, ratingKit: 0.5 });
  });

  it("recusa nota fora de 0,5 a 5, fração que não é meia e tempo impossível", () => {
    expect(runLogSchema.safeParse({ rating: "6" }).success).toBe(false);
    expect(runLogSchema.safeParse({ rating: "0" }).success).toBe(false);
    expect(runLogSchema.safeParse({ rating: "4.3" }).success).toBe(false);
    expect(runLogSchema.safeParse({ distanceKm: "42.195", finishTime: "20:00" }).success).toBe(false);
    expect(runLogSchema.safeParse({ finishTime: "abc" }).success).toBe(false);
  });

  it("limita o comentário", () => {
    expect(runLogSchema.safeParse({ rating: "3", comment: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("summarizeRatings", () => {
  const row = (rating: number | null, ratingKit: number | null = null) => ({
    rating,
    ratingKit,
    ratingCourse: null,
    ratingOrganization: null,
    ratingHydration: null,
  });

  it("faz a média só de quem deu nota", () => {
    const s = summarizeRatings([row(5, 4), row(4), row(null, 1)]);
    expect(s.count).toBe(2);
    expect(s.average).toBe(4.5);
    expect(s.criteria.find((c) => c.key === "ratingKit")).toMatchObject({ average: 4, count: 1 });
    expect(s.criteria.find((c) => c.key === "ratingCourse")).toMatchObject({ average: null, count: 0 });
  });

  it("sem notas não tem média", () => {
    expect(summarizeRatings([])).toMatchObject({ count: 0, average: null });
  });
});

describe("estante", () => {
  it("soma km e conta cidades diferentes", () => {
    const s = shelfStats([
      { distanceKm: 10, city: "São Paulo", state: "SP" },
      { distanceKm: 5.5, city: "são paulo ", state: "SP" },
      { distanceKm: null, city: "Santos", state: "SP" },
    ]);
    expect(s).toEqual({ runs: 3, km: 15.5, cities: 2 });
  });

  it("prova de hoje (Brasília) já entra; a de amanhã não", () => {
    const now = new Date("2026-11-03T02:30:00Z"); // 23h30 do dia 2 em Brasília
    expect(hasStarted(new Date("2026-11-02T10:00:00Z"), now)).toBe(true);
    expect(hasStarted(new Date("2026-11-03T10:00:00Z"), now)).toBe(false);
  });
});
