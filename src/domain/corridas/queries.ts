import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { addDays, parseDateBrt, startOfDayBrt, weekendWindow } from "@/lib/dates";
import { boundingBox, distanceKm } from "@/lib/geo";
import { SEARCH_PAGE_SIZE } from "@/config/corridas";
import type { Prisma } from "@/generated/prisma/client";
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
  registrationStatus: true,
  registrationOpensAt: true,
  imageUrl: true,
  lat: true,
  lng: true,
} satisfies Prisma.RaceSelect;

export type RaceCard = Prisma.RaceGetPayload<{ select: typeof cardSelect }> & {
  distanceFromUserKm?: number;
};

const publicFuture = (now: Date): Prisma.RaceWhereInput => ({
  moderationStatus: "APROVADA",
  startsAt: { gte: now },
});

export async function getWeekendRaces(): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const { start, end } = weekendWindow(new Date());
  return db.race.findMany({
    where: { moderationStatus: "APROVADA", startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    take: 12,
    select: cardSelect,
  });
}

export async function getOpeningSoonRaces(): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  const now = new Date();
  return db.race.findMany({
    where: { ...publicFuture(now), registrationStatus: "EM_BREVE" },
    orderBy: [{ registrationOpensAt: { sort: "asc", nulls: "last" } }, { startsAt: "asc" }],
    take: 8,
    select: cardSelect,
  });
}

export async function getUpcomingRaces(take = 8): Promise<RaceCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG);
  return db.race.findMany({
    where: publicFuture(new Date()),
    orderBy: { startsAt: "asc" },
    take,
    select: cardSelect,
  });
}

export async function getRaceBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(RACES_TAG, `corrida:${slug}`);
  return db.race.findFirst({ where: { slug, moderationStatus: "APROVADA" } });
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
  return db.race.findMany({
    where: { ...publicFuture(new Date()), citySlug },
    orderBy: { startsAt: "asc" },
    take: 100,
    select: cardSelect,
  });
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
    { q: undefined, cidade: undefined, lat, lng, raio: radiusKm, pagina: 1, view: "lista" },
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
  const where: Prisma.RaceWhereInput = { ...publicFuture(now) };
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
  if (filters.preco !== undefined) where.priceMinCents = { lte: Math.round(filters.preco * 100) };

  const from = filters.de ? parseDateBrt(filters.de) : null;
  const to = filters.ate ? parseDateBrt(filters.ate) : null;
  if (from || to) {
    where.startsAt = {
      gte: from && from > now ? startOfDayBrt(from) : now,
      ...(to ? { lt: addDays(startOfDayBrt(to), 1) } : {}),
    };
  }

  const hasGeo = filters.lat !== undefined && filters.lng !== undefined;
  if (hasGeo && filters.raio) {
    const box = boundingBox(filters.lat!, filters.lng!, filters.raio);
    and.push({ lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } });
  }
  if (and.length) where.AND = and;

  const candidates = await db.race.findMany({
    where,
    orderBy: { startsAt: "asc" },
    take: MAX_CANDIDATES,
    select: cardSelect,
  });

  let items: RaceCard[] = candidates;
  if (filters.dist) items = items.filter((r) => matchesDistanceBucket(r.distancesKm, filters.dist!));
  if (hasGeo) {
    items = items
      .map((r) => ({
        ...r,
        distanceFromUserKm:
          r.lat !== null && r.lng !== null ? distanceKm(filters.lat!, filters.lng!, r.lat, r.lng) : undefined,
      }))
      .filter((r) => !filters.raio || (r.distanceFromUserKm !== undefined && r.distanceFromUserKm <= filters.raio));
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
  };
}
