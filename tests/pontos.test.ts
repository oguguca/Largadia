import { describe, expect, it } from "vitest";
import {
  claimBlockReason,
  claimRace,
  claimSchema,
  customRaceSchema,
  formatFinishTime,
  parseFinishTime,
  pointsFor,
  publicName,
} from "@/domain/pontos/pontos";

const race = { startsAt: new Date("2026-11-01T09:00:00Z"), distancesKm: [5, 10, 21.1] };
const premium = { premium: true };
const envio = {
  distanceKm: "10",
  runnerName: "Maria Souza",
  bibNumber: "1234",
  finishTime: "52:30",
  proofUrl: "https://www.strava.com/activities/1",
};

describe("pontos por corrida", () => {
  it("soma fixo por prova e pontos por km", () => {
    expect(pointsFor(5)).toBe(10);
    expect(pointsFor(21.1)).toBe(26);
    expect(pointsFor(42.195)).toBe(47);
  });

  it("libera só para assinante, depois da largada e dentro do prazo", () => {
    expect(claimBlockReason(race, premium, { distanceKm: 10 }, new Date("2026-11-02T00:00:00Z"))).toBeNull();
    expect(claimBlockReason(race, { premium: false }, null, new Date("2026-11-02T00:00:00Z"))).toMatch(/Premium/);
    expect(claimBlockReason(race, null, null, new Date("2026-11-02T00:00:00Z"))).toMatch(/Entre/);
    expect(claimBlockReason(race, premium, null, new Date("2026-10-31T00:00:00Z"))).toMatch(/dia da prova/);
    expect(claimBlockReason(race, premium, null, new Date("2027-01-15T00:00:00Z"))).toMatch(/prazo/);
  });

  it("aceita só distâncias da prova", () => {
    expect(claimBlockReason(race, premium, { distanceKm: 42 }, new Date("2026-11-02T00:00:00Z"))).toMatch(/distâncias/);
  });

  it("aceita a distância informada quando a prova não tem distâncias cadastradas", () => {
    const semDistancias = { ...race, distancesKm: [] };
    const depois = new Date("2026-11-02T00:00:00Z");
    expect(claimBlockReason(semDistancias, premium, { distanceKm: 8 }, depois)).toBeNull();
    expect(claimBlockReason(semDistancias, premium, { distanceKm: 300 }, depois)).toMatch(/entre 1 e/);
  });

  it("valida o link do comprovante", () => {
    expect(claimSchema.safeParse(envio).success).toBe(true);
    expect(claimSchema.safeParse({ ...envio, proofUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("exige nome completo, número de peito e tempo oficial", () => {
    expect(claimSchema.safeParse({ ...envio, runnerName: "Maria" }).success).toBe(false);
    expect(claimSchema.safeParse({ ...envio, bibNumber: "" }).success).toBe(false);
    expect(claimSchema.safeParse({ ...envio, finishTime: "52" }).success).toBe(false);
  });

  it("recusa tempo incompatível com a distância", () => {
    // 10 km em 10 minutos é mais rápido que qualquer recorde
    expect(claimSchema.safeParse({ ...envio, finishTime: "10:00" }).success).toBe(false);
  });

  it("libera a comprovação no próprio dia da prova, mesmo antes do horário estimado", () => {
    const hojeCedo = new Date("2026-11-01T04:00:00Z"); // 01/11, 1h em Brasília
    expect(claimBlockReason(race, premium, null, hojeCedo)).toBeNull();
  });
});

describe("publicName", () => {
  it("mostra o primeiro nome e a inicial do último sobrenome", () => {
    expect(publicName("Maria Souza lima")).toBe("Maria L.");
    expect(publicName("  João  ")).toBe("João");
  });
});

describe("prova informada à mão", () => {
  it("exige nome, data, cidade e UF válidos", () => {
    const ok = { customRaceName: "Corrida da Ponte", customRaceDate: "2026-10-12", customCity: "Niterói", customState: "RJ" };
    expect(customRaceSchema.safeParse(ok).success).toBe(true);
    expect(customRaceSchema.safeParse({ ...ok, customState: "XX" }).success).toBe(false);
    expect(customRaceSchema.safeParse({ ...ok, customRaceDate: "12/10/2026" }).success).toBe(false);
  });

  it("mostra nome e local da prova informada", () => {
    const info = claimRace({
      race: null,
      customRaceName: "Corrida da Ponte",
      customRaceDate: new Date("2026-10-12T03:00:00Z"),
      customCity: "Niterói",
      customState: "RJ",
    });
    expect(info).toMatchObject({ name: "Corrida da Ponte", place: "Niterói/RJ", slug: null });
  });
});

describe("tempo oficial", () => {
  it("lê h:mm:ss e mm:ss", () => {
    expect(parseFinishTime("1:02:33")).toBe(3753);
    expect(parseFinishTime("45:10")).toBe(2710);
    expect(parseFinishTime("abc")).toBeNull();
    expect(formatFinishTime(3753)).toBe("1:02:33");
    expect(formatFinishTime(2710)).toBe("45:10");
  });
});
