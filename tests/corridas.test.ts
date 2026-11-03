import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { distanceKm, boundingBox } from "@/lib/geo";
import { parseDateBrt, weekendWindow } from "@/lib/dates";
import { formatDistance, formatPriceRange } from "@/lib/format";
import { matchesDistanceBucket, parseSearchFilters, toQueryString } from "@/domain/corridas/filtros";

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
