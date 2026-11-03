import type { Race } from "@/generated/prisma/client";
import { formatDistance } from "@/lib/format";

const availability = {
  ABERTAS: "https://schema.org/InStock",
  EM_BREVE: "https://schema.org/PreOrder",
  ESGOTADAS: "https://schema.org/SoldOut",
  ENCERRADAS: "https://schema.org/SoldOut",
} as const;

/** Dados estruturados schema.org/SportsEvent (subtipo de Event) para a página da corrida. */
export function raceJsonLd(race: Race, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    // Sem horário confirmado, informa só o dia (em Brasília) para não anunciar uma hora errada
    startDate: race.timeKnown ? race.startsAt.toISOString() : new Date(race.startsAt.getTime() - 3 * 3600_000).toISOString().slice(0, 10),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Corrida de rua",
    description: race.description.slice(0, 500),
    url: `${siteUrl}/corrida/${race.slug}`,
    image: race.imageUrl ? [race.imageUrl] : undefined,
    location: {
      "@type": "Place",
      name: race.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: race.city,
        addressRegion: race.state,
        addressCountry: "BR",
      },
      geo:
        race.lat !== null && race.lng !== null
          ? { "@type": "GeoCoordinates", latitude: race.lat, longitude: race.lng }
          : undefined,
    },
    organizer: { "@type": "Organization", name: race.organizer },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      ...(race.priceKnown
        ? { lowPrice: (race.priceMinCents / 100).toFixed(2), highPrice: (race.priceMaxCents / 100).toFixed(2) }
        : {}),
      availability: availability[race.registrationStatus],
      url: race.registrationUrl,
    },
    keywords: race.distancesKm.map(formatDistance).join(", "),
  };
}
