import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { distanceKm, boundingBox } from "@/lib/geo";
import { parseDateBrt, weekendWindow } from "@/lib/dates";
import { formatDistance, formatPriceRange } from "@/lib/format";
import { matchesDistanceBucket, parseSearchFilters, toQueryString } from "@/domain/corridas/filtros";
import { formDataToSubmission, raceSubmissionSchema } from "@/domain/corridas/submissao";

describe("slugify", () => {
  it("remove acentos e espaços", () => {
    expect(slugify("Meia Maratona de São Paulo 2027")).toBe("meia-maratona-de-sao-paulo-2027");
    expect(slugify("  Corrida — Ilha da Magia!  ")).toBe("corrida-ilha-da-magia");
  });
});

describe("geo", () => {
  it("calcula distância São Paulo–Rio (~360 km)", () => {
    const d = distanceKm(-23.5505, -46.6333, -22.9068, -43.1729);
    expect(d).toBeGreaterThan(350);
    expect(d).toBeLessThan(370);
  });
  it("caixa contém o centro", () => {
    const b = boundingBox(-23.5, -46.6, 50);
    expect(b.minLat).toBeLessThan(-23.5);
    expect(b.maxLng).toBeGreaterThan(-46.6);
  });
});

describe("datas em horário de Brasília", () => {
  it("parseDateBrt retorna meia-noite BRT (03:00 UTC)", () => {
    expect(parseDateBrt("2026-11-07")!.toISOString()).toBe("2026-11-07T03:00:00.000Z");
    expect(parseDateBrt("07/11/2026")).toBeNull();
  });
  it("numa quarta, o fim de semana vai de sábado a segunda", () => {
    const { start, end } = weekendWindow(new Date("2026-11-04T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-07T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
  it("num domingo, a janela começa agora e termina segunda", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const { start, end } = weekendWindow(now);
    expect(start).toEqual(now);
    expect(end.toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });
});

describe("formatação", () => {
  it("distâncias", () => {
    expect(formatDistance(21.1)).toBe("21k");
    expect(formatDistance(42.195)).toBe("42k");
    expect(formatDistance(0.5)).toBe("0,5k");
  });
  it("preços", () => {
    expect(formatPriceRange(0, 0)).toBe("Gratuita");
    expect(formatPriceRange(9900, 9900)).toMatch(/R\$\s?99/);
  });
});

describe("filtros de busca", () => {
  it("descarta valores inválidos sem quebrar", () => {
    const f = parseSearchFilters({ uf: "XX", dist: "maratona", pagina: "-3", preco: "abc", q: "rio" });
    expect(f).toMatchObject({ uf: undefined, dist: undefined, pagina: 1, preco: undefined, q: "rio", view: "lista" });
  });
  it("faixa de distância", () => {
    expect(matchesDistanceBucket([5, 10], "ate-5")).toBe(true);
    expect(matchesDistanceBucket([21.1], "11-21")).toBe(true);
    expect(matchesDistanceBucket([42.195], "22-42")).toBe(true);
    expect(matchesDistanceBucket([50], "ultra")).toBe(true);
    expect(matchesDistanceBucket([10], "ultra")).toBe(false);
  });
  it("querystring omite padrões", () => {
    const f = parseSearchFilters({ uf: "SP" });
    expect(toQueryString(f)).toBe("?uf=SP");
    expect(toQueryString(f, { pagina: 2 })).toBe("?uf=SP&pagina=2");
  });
});

describe("envio de organizador", () => {
  function form(overrides: Record<string, string | string[]> = {}) {
    const fd = new FormData();
    const base: Record<string, string | string[]> = {
      name: "Corrida Teste do Bairro",
      date: "2099-05-10",
      time: "07:00",
      city: "Santos",
      state: "SP",
      venue: "Orla da praia",
      distances: ["5", "10"],
      type: "RUA",
      priceMin: "80",
      priceMax: "100",
      registrationUrl: "https://exemplo.com.br/inscricao",
      registrationStatus: "ABERTAS",
      organizer: "Organização Teste",
      organizerEmail: "org@exemplo.com.br",
      description: "Uma corrida de teste com descrição suficientemente longa.",
      consent: "on",
      ...overrides,
    };
    for (const [k, v] of Object.entries(base)) for (const x of [v].flat()) fd.append(k, x);
    return formDataToSubmission(fd);
  }

  it("aceita envio válido e calcula o horário em BRT", () => {
    const r = raceSubmissionSchema.parse(form({ otherDistance: "7,5" }));
    expect(r.startsAt.toISOString()).toBe("2099-05-10T10:00:00.000Z");
    expect(r.distances).toEqual([5, 7.5, 10]);
  });
  it("rejeita link javascript: e data passada", () => {
    const r = raceSubmissionSchema.safeParse(form({ registrationUrl: "javascript:alert(1)", date: "2001-01-01" }));
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("registrationUrl");
  });
  it("rejeita preço máximo menor que o mínimo e sem consentimento", () => {
    const r = raceSubmissionSchema.safeParse(form({ priceMin: "100", priceMax: "50", consent: "" }));
    expect(r.success).toBe(false);
  });
});
