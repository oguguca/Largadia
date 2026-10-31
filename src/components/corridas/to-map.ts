import type { RaceCard } from "@/domain/corridas/queries";
import { formatDateShort, formatDistance } from "@/lib/format";
import type { MapRace } from "./race-map";

export function toMapRaces(races: RaceCard[]): MapRace[] {
  return races
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      lat: r.lat!,
      lng: r.lng!,
      city: r.city,
      state: r.state,
      dateLabel: formatDateShort(r.startsAt),
      distancesLabel: r.distancesKm.map(formatDistance).join(" · "),
    }));
}
