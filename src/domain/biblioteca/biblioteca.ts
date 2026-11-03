import { z } from "zod";
import { PACE_LIMITS, parseFinishTime } from "@/domain/pontos/pontos";

/** Notas opcionais da avaliação, além da nota geral. */
export const CRITERIA = [
  { key: "ratingCourse", label: "Percurso" },
  { key: "ratingOrganization", label: "Organização" },
  { key: "ratingKit", label: "Kit" },
  { key: "ratingHydration", label: "Hidratação" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const COMMENT_MAX = 1000;

/** Campo vazio do formulário vira "não informado". */
const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
/** Nota de 0,5 a 5, de meia em meia estrela. */
const stars = z.preprocess(
  blank,
  z.coerce
    .number()
    .min(0.5, "Nota de 0,5 a 5")
    .max(5, "Nota de 0,5 a 5")
    .refine((v) => Number.isInteger(v * 2), "Use meia estrela ou estrela inteira")
    .optional(),
);

/** Distância, tempo e avaliação de uma corrida da estante. Tudo é opcional, menos a nota geral quando há critério ou comentário. */
export const runLogSchema = z
  .object({
    distanceKm: z.preprocess(blank, z.coerce.number().min(0.5, "Distância inválida").max(300, "Distância inválida").optional()),
    finishTime: z.preprocess(
      blank,
      z
        .string()
        .trim()
        .optional()
        .transform((v, ctx) => {
          if (!v) return undefined;
          const seconds = parseFinishTime(v);
          if (seconds === null) {
            ctx.addIssue({ code: "custom", message: "Use o formato h:mm:ss ou mm:ss" });
            return z.NEVER;
          }
          return seconds;
        }),
    ),
    rating: stars,
    ratingCourse: stars,
    ratingOrganization: stars,
    ratingKit: stars,
    ratingHydration: stars,
    comment: z.preprocess(blank, z.string().trim().max(COMMENT_MAX, `Até ${COMMENT_MAX} caracteres`).optional()),
  })
  .superRefine((v, ctx) => {
    const extras = CRITERIA.some((c) => v[c.key] !== undefined) || !!v.comment;
    if (extras && v.rating === undefined) ctx.addIssue({ code: "custom", path: ["rating"], message: "Dê a nota geral" });
    if (v.distanceKm && v.finishTime) {
      const pace = v.finishTime / v.distanceKm;
      if (pace < PACE_LIMITS.fastest || pace > PACE_LIMITS.slowest) {
        ctx.addIssue({ code: "custom", path: ["finishTime"], message: "Tempo incompatível com a distância" });
      }
    }
  });

export type RunLogInput = z.infer<typeof runLogSchema>;

/** Colunas do banco a partir do formulário validado; o que ficou em branco é apagado. */
export function runLogData(v: RunLogInput) {
  return {
    distanceKm: v.distanceKm ?? null,
    finishSeconds: v.finishTime ?? null,
    rating: v.rating ?? null,
    ratingCourse: v.ratingCourse ?? null,
    ratingOrganization: v.ratingOrganization ?? null,
    ratingKit: v.ratingKit ?? null,
    ratingHydration: v.ratingHydration ?? null,
    comment: v.comment || null,
  };
}

type Ratings = { rating: number | null } & Record<CriterionKey, number | null>;

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Nota média (uma casa) e média de cada critério, só com quem deu nota. */
export function summarizeRatings(rows: Ratings[]) {
  const rated = rows.filter((r) => r.rating !== null);
  return {
    count: rated.length,
    average: mean(rated.map((r) => r.rating!)),
    criteria: CRITERIA.map((c) => {
      const xs = rated.map((r) => r[c.key]).filter((x): x is number => x !== null);
      return { key: c.key, label: c.label, average: mean(xs), count: xs.length };
    }),
  };
}

/** Totais da estante: corridas, km e cidades diferentes. */
export function shelfStats(logs: { distanceKm: number | null; city: string | null; state: string | null }[]) {
  const places = new Set(logs.filter((l) => l.city && l.state).map((l) => `${l.city!.trim().toLowerCase()}/${l.state}`));
  return {
    runs: logs.length,
    km: Math.round(logs.reduce((n, l) => n + (l.distanceKm ?? 0), 0) * 10) / 10,
    cities: places.size,
  };
}

/** Dia de Brasília (aaaa-mm-dd) de um instante. */
export const brtDay = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

/** A prova já aconteceu (no dia de Brasília)? Só corrida que já largou entra na estante. */
export function hasStarted(startsAt: Date, now = new Date()): boolean {
  return brtDay(startsAt) <= brtDay(now);
}

export type PersonalRecord = { distanceKm: number; seconds: number; paceSeconds: number; name: string; logId: string };

/** Melhor tempo em cada distância corrida (só corridas com distância e tempo), da menor para a maior distância. */
export function personalRecords(
  logs: { id: string; name: string; distanceKm: number | null; finishSeconds: number | null }[],
): PersonalRecord[] {
  const best = new Map<number, PersonalRecord>();
  for (const l of logs) {
    if (!l.distanceKm || !l.finishSeconds) continue;
    const current = best.get(l.distanceKm);
    if (!current || l.finishSeconds < current.seconds) {
      best.set(l.distanceKm, {
        distanceKm: l.distanceKm,
        seconds: l.finishSeconds,
        paceSeconds: Math.round(l.finishSeconds / l.distanceKm),
        name: l.name,
        logId: l.id,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}
