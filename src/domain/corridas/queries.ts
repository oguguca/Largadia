import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { addDays, parseDateBrt, startOfDayBrt, weekendWindow } from "@/lib/dates";
import { boundingBox, distanceKm } from "@/lib/geo";
import { SEARCH_PAGE_SIZE } from "@/config/corridas";
import type { Prisma } from "@/generated/prisma/client";
import type { RegistrationStatus } from "@/generated/prisma/enums";
import { matchesDistanceBucket, type SearchFilters } from "./filtros";

export const RACES_TAG = "corridas";

/** Campos usados nos cards e no mapa. */
const cardSelect = {
  id: true,
  slug: true,
  name: true,
  startsAt: true,
  city: true,
  citySlug: true,
  state: true,
  distancesKm: true,
  type: true,
  priceMinCents: true,
  priceMaxCents: true,
  priceKnown: true,
  registrationStatus: true,
  registrationOpensAt: true,
  registrationClosesAt: true,
  timeKnown: true,
  imageUrl: true,
  lat: true,
  lng: true,
  couponLabel: true,
} satisfies Prisma.RaceSelect;

export type RaceCard = Prisma.RaceGetPayload<{ select: typeof cardSelect }> & {
  distanceFromUserKm?: number;
  /** A prova já aconteceu (calculado na consulta, para não depender do relógio na renderização) */
  isPast?: boolean;
};

type LiveFields = { startsAt: Date; registrationStatus: RegistrationStatus; registrationClosesAt: Date | null };

/**
 * Campos que dependem do relógio, calculados na consulta (não na renderização): a prova já aconteceu
 * e, passado o último dia de inscrição, a situação vira "encerradas" sem ninguém precisar editar.
 */
export function withLiveStatus<T extends LiveFields>(race: T, now: Date): T & { isPast: boolean } {
  const closed = race.registrationStatus === "ABERTAS" && race.registrationClosesAt && race.registrationClosesAt.getTime() + 86_400_000 <= now.getTime();
  return { ...race, isPast: race.startsAt < now, registrationStatus: closed ? "ENCERRADAS" : race.registrationStatus };
}

function markPast<T extends LiveFields>(races: T[], now: Date): (T & { isPast: boolean })[] {
  return races.map((r) => withLiveStatus(r, now));
}

const publicFuture = (now: Date): Prisma.RaceWhereInput => ({
  moderationStatus: "APROVADA",
  startsAt: { gte: now },
});

export async function getWeekendRaces(): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const { start, end } = weekendWindow(new Date());
  const races = await db.race.findMany({
    where: { moderationStatus: "APROVADA", startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    take: 12,
    select: cardSelect,
  });
  return markPast(races, new Date());
}

export async function getOpeningSoonRaces(): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const now = new Date();
  const races = await db.race.findMany({
    where: { ...publicFuture(now), registrationStatus: "EM_BREVE" },
    orderBy: [{ registrationOpensAt: { sort: "asc", nulls: "last" } }, { startsAt: "asc" }],
    take: 8,
    select: cardSelect,
  });
  return markPast(races, now);
}

export async function getFeaturedRaces(): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const races = await db.race.findMany({
    where: { ...publicFuture(new Date()), featured: true },
    orderBy: [{ featuredOrder: { sort: "asc", nulls: "last" } }, { startsAt: "asc" }],
    take: 8,
    select: cardSelect,
  });
  return markPast(races, new Date());
}

/** Provas de um mês (horário de Brasília), incluindo as que já aconteceram. */
export async function getMonthRaces(year: number, month: number): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const start = new Date(Date.UTC(year, month - 1, 1, 3));
  const end = new Date(Date.UTC(year, month, 1, 3));
  const races = await db.race.findMany({
    where: { moderationStatus: "APROVADA", startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    select: cardSelect,
  });
  return markPast(races, new Date());
}

export async function getUpcomingRaces(take = 8): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const races = await db.race.findMany({
    where: publicFuture(new Date()),
    orderBy: { startsAt: "asc" },
    take,
    select: cardSelect,
  });
  return markPast(races, new Date());
}

/** Provas futuras por UF, da que tem mais para a que tem menos. */
export async function getStatesWithRaces(): Promise<{ state: string; count: number }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const rows = await db.race.groupBy({
    by: ["state"],
    where: publicFuture(new Date()),
    _count: { _all: true },
    orderBy: { _count: { state: "desc" } },
  });
  return rows.map((r) => ({ state: r.state, count: r._count._all }));
}

export async function getRaceBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG, `corrida:${slug}`);
  const race = await db.race.findFirst({ where: { slug, moderationStatus: "APROVADA" } });
  return race ? withLiveStatus(race, new Date()) : null;
}

/** Cidades com corridas futuras, para a página da cidade e o sitemap. */
export async function getCityBySlug(citySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  return db.race.findFirst({
    where: { citySlug, moderationStatus: "APROVADA" },
    select: { city: true, state: true, citySlug: true },
  });
}

export async function getCityRaces(citySlug: string): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const races = await db.race.findMany({
    where: { ...publicFuture(new Date()), citySlug },
    orderBy: { startsAt: "asc" },
    take: 100,
    select: cardSelect,
  });
  return markPast(races, new Date());
}

export async function getCitiesWithRaces() {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const rows = await db.race.groupBy({
    by: ["citySlug", "city", "state"],
    where: publicFuture(new Date()),
    _count: { _all: true },
    orderBy: { _count: { citySlug: "desc" } },
  });
  return rows.map((r) => ({ citySlug: r.citySlug, city: r.city, state: r.state, count: r._count._all }));
}

export async function getNearbyRaces(lat: number, lng: number, radiusKm = 100, take = 8): Promise<RaceCard[]> {
  const result = await searchRaces(
    { q: undefined, cidade: undefined, lat, lng, raio: radiusKm, realizadas: false, pagina: 1, view: "lista" },
    new Date(),
  );
  return result.items.slice(0, take);
}

/** Teto de candidatos lidos do banco por busca antes dos filtros em memória. */
const MAX_CANDIDATES = 1000;

/**
 * Busca de corridas. Os filtros simples vão para o banco; distância (array) e
 * raio exato são aplicados em memória sobre um pré-filtro por caixa geográfica.
 * Com volume grande, migrar raio para PostGIS e distância para SQL com unnest.
 */
export async function searchRaces(filters: SearchFilters, now: Date) {
  const where: Prisma.RaceWhereInput = filters.realizadas
    ? { moderationStatus: "APROVADA", startsAt: { lt: now } }
    : { ...publicFuture(now) };
  const and: Prisma.RaceWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } },
        { organizer: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.uf) where.state = filters.uf;
  if (filters.cidade) where.citySlug = filters.cidade;
  if (filters.tipo) where.type = filters.tipo;

  const from = filters.de ? parseDateBrt(filters.de) : null;
  const to = filters.ate ? parseDateBrt(filters.ate) : null;
  if (from || to) {
    // Próximas: começa no máximo agora. Realizadas: termina no máximo agora.
    const gte = filters.realizadas ? (from ? startOfDayBrt(from) : undefined) : from && from > now ? startOfDayBrt(from) : now;
    const toEnd = to ? addDays(startOfDayBrt(to), 1) : undefined;
    const lt = filters.realizadas ? (toEnd && toEnd < now ? toEnd : now) : toEnd;
    where.startsAt = { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
  }

  const hasGeo = filters.lat !== undefined && filters.lng !== undefined;
  if (hasGeo && filters.raio) {
    const box = boundingBox(filters.lat!, filters.lng!, filters.raio);
    and.push({ lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } });
  }
  if (and.length) where.AND = and;

  const candidates = await db.race.findMany({
    where,
    // Realizadas: as mais recentes primeiro; próximas: as mais próximas primeiro
    orderBy: { startsAt: filters.realizadas ? "desc" : "asc" },
    take: MAX_CANDIDATES,
    select: cardSelect,
  });

  let items: RaceCard[] = markPast(candidates, now);
  if (hasGeo) {
    items = items
      .map((r) => ({
        ...r,
        distanceFromUserKm:
          r.lat !== null && r.lng !== null ? distanceKm(filters.lat!, filters.lng!, r.lat, r.lng) : undefined,
      }))
      .filter((r) => !filters.raio || (r.distanceFromUserKm !== undefined && r.distanceFromUserKm <= filters.raio));
  }

  // Distância e preço por último: a prova que bate com o resto, mas não informa o dado, é contada à parte.
  // A maioria das importadas chega sem distância e sem preço, e sumir com elas sem aviso parecia busca quebrada.
  const unknown = { distance: 0, price: 0 };
  if (filters.dist || filters.preco !== undefined) {
    const maxCents = filters.preco !== undefined ? Math.round(filters.preco * 100) : null;
    items = items.filter((r) => {
      const distOk = !filters.dist || matchesDistanceBucket(r.distancesKm, filters.dist);
      const distUnknown = !!filters.dist && r.distancesKm.length === 0;
      // Sem preço conhecido não dá para dizer se é gratuita ou cabe no valor
      const priceOk = maxCents === null || (r.priceKnown && r.priceMinCents <= maxCents);
      const priceUnknown = maxCents !== null && !r.priceKnown;
      if (distOk && priceOk) return true;
      if ((distOk || distUnknown) && (priceOk || priceUnknown)) {
        if (distUnknown) unknown.distance++;
        else unknown.price++;
      }
      return false;
    });
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const page = Math.min(filters.pagina, pages);
  return {
    total,
    page,
    pages,
    items: items.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE),
    /** Para o mapa: todos os resultados com coordenadas, sem paginação */
    mapItems: items.filter((r) => r.lat !== null && r.lng !== null),
    /** Provas que batem com os outros filtros, mas ficaram de fora por não informar distância ou preço */
    unknown,
  };
}
