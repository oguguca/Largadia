import { describe, expect, it } from "vitest";
import { dayKeyBrt, fillDailySeries } from "@/domain/admin/metricas";

describe("métricas do painel", () => {
  it("usa o dia de Brasília", () => {
    expect(dayKeyBrt(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10-31");
    expect(dayKeyBrt(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11-01");
  });

  it("preenche os dias sem clique com zero, em ordem", () => {
    const series = fillDailySeries([{ day: "2026-10-30", count: 4 }], new Date("2026-10-31T15:00:00Z"), 3);
    expect(series).toEqual([
      { day: "2026-10-29", count: 0 },
      { day: "2026-10-30", count: 4 },
      { day: "2026-10-31", count: 0 },
    ]);
  });
});
