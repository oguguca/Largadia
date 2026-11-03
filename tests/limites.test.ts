import { describe, expect, it } from "vitest";
import { parseDateBrt } from "@/lib/dates";
import { addMonths } from "@/domain/assinatura/status";
import { rankTotals } from "@/domain/pontos/temporada";
import { claimSchema } from "@/domain/pontos/pontos";
import { parseWrittenDate } from "@/domain/importacao/calendario";

describe("datas que não existem", () => {
  it("parseDateBrt recusa 30/02 e mês 13 em vez de transbordar", () => {
    expect(parseDateBrt("2026-02-30")).toBeNull();
    expect(parseDateBrt("2026-13-01")).toBeNull();
    expect(parseDateBrt("2028-02-29")?.toISOString()).toBe("2028-02-29T03:00:00.000Z");
  });

  it("parseWrittenDate recusa dia inexistente", () => {
    expect(parseWrittenDate("30 Fevereiro 2027")).toBeUndefined();
    expect(parseWrittenDate("0 Janeiro 2027")).toBeUndefined();
    expect(parseWrittenDate("25 Janeiro 2026")).toBe("2026-01-25");
  });
});

describe("Pix conta o mês no dia de Brasília", () => {
  it("pago dia 30 às 22h vence dia 30 do mês seguinte", () => {
    // 30/05 22h BRT = 31/05 01h UTC
    expect(addMonths(new Date("2027-05-31T01:00:00Z"), 1).toISOString()).toBe("2027-07-01T01:00:00.000Z");
    // 30/01 22h BRT: fevereiro não tem 30, vence no último dia (28/02 22h BRT)
    expect(addMonths(new Date("2027-01-31T01:00:00Z"), 1).toISOString()).toBe("2027-03-01T01:00:00.000Z");
  });
});

describe("ranking", () => {
  it("empata km somados em ponto flutuante", () => {
    const rows = rankTotals([
      { userId: "a", points: 41, races: 2, km: 10.1 + 21.1 },
      { userId: "b", points: 41, races: 2, km: 31.2 },
    ]);
    expect(rows.map((r) => r.position)).toEqual([1, 1]);
  });
});

describe("registro de corrida", () => {
  it("distância zero mostra só o erro da distância", () => {
    const r = claimSchema.safeParse({
      raceId: "x",
      distanceKm: "0",
      finishTime: "30:00",
      runnerName: "Ana Souza",
      bibNumber: "123",
      proofUrl: "https://example.com/resultado",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "finishTime")).toBe(false);
  });
});
