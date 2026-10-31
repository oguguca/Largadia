import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRaceBySlug } from "@/domain/corridas/queries";
import { raceTypeLabels } from "@/config/corridas";
import { formatDateLong, formatDistance, formatPriceRange, formatTime } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { RaceVisual } from "@/components/corridas/race-visual";
import { StatusBadge } from "@/components/corridas/status-badge";
import { RaceMapLazy } from "@/components/corridas/race-map-lazy";
import { raceJsonLd } from "./json-ld";

export async function generateMetadata(props: PageProps<"/corrida/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const race = await getRaceBySlug(slug);
  if (!race) return { title: "Corrida não encontrada" };
  const description = `${race.name} em ${race.city}/${race.state}, ${formatDateLong(race.startsAt)}. Distâncias: ${race.distancesKm
    .map(formatDistance)
    .join(", ")}.`;
  return {
    title: `${race.name} — ${race.city}/${race.state}`,
    description,
    alternates: { canonical: `/corrida/${race.slug}` },
    openGraph: { title: race.name, description, type: "website", images: race.imageUrl ? [race.imageUrl] : undefined },
  };
}

export default function CorridaPage(props: PageProps<"/corrida/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse px-4 py-6" />}>
      <RaceDetail params={props.params} />
    </Suspense>
  );
}

async function RaceDetail({ params }: { params: PageProps<"/corrida/[slug]">["params"] }) {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);
  if (!race) notFound();

  const canRegister = race.registrationStatus === "ABERTAS";

  return (
    <article className="pb-24 md:pb-10">
      <script
        type="application/ld+json"
        // JSON.stringify com escape de "<" evita fechar a tag script com dados do organizador
        dangerouslySetInnerHTML={{ __html: JSON.stringify(raceJsonLd(race, siteUrl)).replace(/</g, "\\u003c") }}
      />

      <div className="relative">
        <RaceVisual imageUrl={race.imageUrl} type={race.type} name={race.name} className="h-48 w-full md:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-asfalto-950/90 via-asfalto-950/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-4 text-white">
          <nav className="mb-1 text-xs text-asfalto-300" aria-label="Trilha">
            <Link href="/busca" className="hover:text-white">Corridas</Link> ·{" "}
            <Link href={`/corridas/${race.citySlug}`} className="hover:text-white">
              {race.city}
            </Link>
          </nav>
          <h1 className="font-display text-3xl leading-none font-extrabold italic uppercase md:text-5xl">{race.name}</h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 ring-1 ring-asfalto-100 sm:grid-cols-3">
            <Info label="Data">{formatDateLong(race.startsAt)}</Info>
            <Info label="Largada">{formatTime(race.startsAt)}</Info>
            <Info label="Tipo">{raceTypeLabels[race.type]}</Info>
            <Info label="Local">
              {race.venue} — {race.city}/{race.state}
            </Info>
            <Info label="Distâncias">{race.distancesKm.map(formatDistance).join(" · ")}</Info>
            <Info label="Valor">{formatPriceRange(race.priceMinCents, race.priceMaxCents)}</Info>
            <Info label="Organização">{race.organizer}</Info>
          </dl>

          <section>
            <h2 className="mb-2 font-display text-xl font-bold uppercase">Sobre a prova</h2>
            <div className="space-y-3 leading-relaxed whitespace-pre-line text-asfalto-800">{race.description}</div>
          </section>

          {race.lat !== null && race.lng !== null && (
            <section>
              <h2 className="mb-2 font-display text-xl font-bold uppercase">Local de largada</h2>
              <div className="h-64 overflow-hidden rounded-2xl ring-1 ring-asfalto-100">
                <RaceMapLazy
                  races={[
                    {
                      slug: race.slug,
                      name: race.name,
                      lat: race.lat,
                      lng: race.lng,
                      city: race.city,
                      state: race.state,
                      dateLabel: formatDateLong(race.startsAt),
                      distancesLabel: race.venue,
                    },
                  ]}
                />
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-display text-xl font-bold uppercase">Avaliações de quem correu</h2>
            <p className="rounded-2xl bg-white p-4 text-sm text-asfalto-500 ring-1 ring-asfalto-100">
              Ainda não há avaliações. Depois da prova, quem correu poderá avaliar organização, hidratação, kit, percurso e medalha.
            </p>
          </section>
        </div>

        {/* No celular, o CTA fica fixo acima da barra de navegação */}
        <aside className="fixed inset-x-0 bottom-14 z-30 border-t border-asfalto-100 bg-white p-3 md:static md:self-start md:rounded-2xl md:border-0 md:p-4 md:ring-1 md:ring-asfalto-100">
          <div className="mb-2 hidden md:block">
            <StatusBadge status={race.registrationStatus} />
          </div>
          {canRegister ? (
            <a
              href={race.registrationUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block rounded-xl bg-largada-500 px-4 py-3 text-center font-semibold text-asfalto-950 hover:bg-largada-600"
            >
              Ir para inscrição ↗
            </a>
          ) : (
            <a
              href={race.registrationUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block rounded-xl bg-asfalto-100 px-4 py-3 text-center font-semibold text-asfalto-700"
            >
              Ver site oficial ↗
            </a>
          )}
          <p className="mt-2 hidden text-xs text-asfalto-500 md:block">
            A inscrição é feita no site oficial do organizador.
          </p>
        </aside>
      </div>
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-asfalto-500 uppercase">{label}</dt>
      <dd className="text-sm font-medium first-letter:uppercase">{children}</dd>
    </div>
  );
}
