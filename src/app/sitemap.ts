import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const races = await db.race.findMany({
    where: { moderationStatus: "APROVADA", startsAt: { gte: new Date() } },
    select: { slug: true, citySlug: true, updatedAt: true },
  });
  const cities = [...new Set(races.map((r) => r.citySlug))];
  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/busca`, changeFrequency: "daily" },
    ...cities.map((c) => ({ url: `${siteUrl}/corridas/${c}`, changeFrequency: "weekly" as const })),
    ...races.map((r) => ({ url: `${siteUrl}/corrida/${r.slug}`, lastModified: r.updatedAt })),
  ];
}
