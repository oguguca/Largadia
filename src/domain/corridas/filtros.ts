import { z } from "zod";
import { distanceBuckets, type DistanceBucket } from "@/config/corridas";
import { UFS } from "@/config/corridas";

const optionalString = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalNumber = (min: number, max: number) =>
  z.coerce.number().min(min).max(max).optional().catch(undefined);

/** Filtros da busca, lidos da querystring. Valores inválidos são descartados em vez de quebrar a página. */
export const searchFiltersSchema = z.object({
  q: optionalString,
  uf: z.enum(UFS).optional().catch(undefined),
  cidade: optionalString,
  lat: optionalNumber(-34, 6),
  lng: optionalNumber(-74, -28),
  raio: optionalNumber(1, 1000),
  dist: z
    .enum(Object.keys(distanceBuckets) as [DistanceBucket, ...DistanceBucket[]])
    .optional()
    .catch(undefined),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  /** Preço máximo em reais */
  preco: optionalNumber(0, 10_000),
  tipo: z.enum(["RUA", "TRAIL", "NOTURNA", "TEMATICA", "SOLIDARIA", "KIDS"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(500).catch(1).default(1),
  view: z.enum(["lista", "mapa"]).catch("lista").default("lista"),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export function parseSearchFilters(raw: Record<string, string | string[] | undefined>): SearchFilters {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return searchFiltersSchema.parse(flat);
}

/** A corrida tem alguma distância dentro da faixa escolhida? */
export function matchesDistanceBucket(distancesKm: number[], bucket: DistanceBucket): boolean {
  const { min, max } = distanceBuckets[bucket];
  return distancesKm.some((d) => d >= min && d <= max);
}

/** Monta a querystring preservando os filtros atuais, para links de paginação e troca de visualização. */
export function toQueryString(filters: Partial<SearchFilters>, overrides: Partial<SearchFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "pagina" && v === 1) continue;
    if (k === "view" && v === "lista") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
