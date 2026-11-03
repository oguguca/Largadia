import { describe, expect, it } from "vitest";
import { parseDateBrt } from "@/lib/dates";
import { addMonths } from "@/domain/assinatura/status";
import { rankTotals } from "@/domain/pontos/temporada";
import { claimSchema } from "@/domain/pontos/pontos";
import { parseWrittenDate, yescomId } from "@/domain/importacao/calendario";

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

  it("parseWrittenDate: período que vira o ano começa no ano anterior", () => {
    expect(parseWrittenDate("31 de dezembro a 1 de janeiro 2027")).toBe("2026-12-31");
    expect(parseWrittenDate("30 de maio a 1 de junho de 2027")).toBe("2027-05-30");
    expect(parseWrittenDate("25 e 26 de abril de 2027")).toBe("2027-04-25");
  });
});

describe("Yescom", () => {
  it("mesma prova com o caminho em maiúsculas ou minúsculas gera a mesma chave", () => {
    expect(yescomId("https://www.yescom.com.br/MaratonaSP/2026/", "2026-04-12", "Maratona")).toBe(
      yescomId("https://www.yescom.com.br/maratonasp/2026/", "2026-04-12", "Maratona"),
    );
  });
});

describe("reembolso de Pix", () => {
  it("addMonths volta meses inteiros, respeitando o fim do mês", () => {
    // 30/06 22h BRT menos 1 mês = 30/05 22h BRT
    expect(addMonths(new Date("2027-07-01T01:00:00Z"), -1).toISOString()).toBe("2027-05-31T01:00:00.000Z");
    // 31/03 menos 1 mês = 28/02
    expect(addMonths(new Date("2027-03-31T15:00:00Z"), -1).toISOString()).toBe("2027-02-28T15:00:00.000Z");
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
