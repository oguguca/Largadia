import Link from "next/link";
import type { RaceCard as RaceCardData } from "@/domain/corridas/queries";
import { formatDateShort, formatDistance, formatPriceRange, formatTime } from "@/lib/format";
import { RaceVisual } from "./race-visual";
import { PastBadge, StatusBadge } from "./status-badge";

export function RaceCard({ race }: { race: RaceCardData }) {
  const [day, month] = formatDateShort(race.startsAt).split(" de ");
  return (
    <Link
      href={`/corrida/${race.slug}`}
      className={`group flex w-full overflow-hidden ${race.isPast ? "opacity-75" : ""} rounded-2xl bg-white shadow-sm ring-1 ring-asfalto-100 transition hover:-translate-y-0.5 hover:shadow-md sm:flex-col`}
    >
      <div className="relative w-28 shrink-0 sm:w-full">
        <RaceVisual imageUrl={race.imageUrl} type={race.type} name={race.name} className="h-full w-full sm:aspect-square sm:h-auto" />
        <div className="absolute top-2 left-2 rounded-lg bg-asfalto-950/90 px-2 py-1 text-center leading-none text-white">
          <span className="block font-display text-xl font-bold">{day}</span>
          <span className="block text-[10px] uppercase">{month}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 font-semibold leading-snug text-asfalto-950 group-hover:text-largada-600">
          {race.name}
        </h3>
        <p className="text-sm text-asfalto-500">
          {race.city}/{race.state}
          {race.timeKnown && <> · {formatTime(race.startsAt)}</>}
          {race.distanceFromUserKm !== undefined && (
            <> · {Math.round(race.distanceFromUserKm)} km de você</>
          )}
        </p>
        <div className="flex flex-wrap gap-1">
          {race.distancesKm.map((d) => (
            <span key={d} className="rounded bg-asfalto-100 px-1.5 py-0.5 text-xs font-semibold text-asfalto-700">
              {formatDistance(d)}
            </span>
          ))}
        </div>
        {race.couponLabel && !race.isPast && (
          <p className="text-xs font-semibold text-emerald-700">🎟️ Cupom Largadia: {race.couponLabel}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          {race.isPast ? <PastBadge /> : <StatusBadge status={race.registrationStatus} />}
          <span className="text-sm font-medium text-asfalto-700">
            {formatPriceRange(race.priceMinCents, race.priceMaxCents, race.priceKnown)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RaceGrid({ races }: { races: RaceCardData[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {races.map((r) => (
        <li key={r.id} className="flex">
          <RaceCard race={r} />
        </li>
      ))}
    </ul>
  );
}
