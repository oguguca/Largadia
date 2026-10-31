import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRaceBySlug } from "@/domain/corridas/queries";
import { raceTypeLabels } from "@/config/corridas";
import { formatDateLong, formatDistance, formatPriceRange, formatTime } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { RaceVisual } from "@/components/corridas/race-visual";
import { PastBadge, StatusBadge } from "@/components/corridas/status-badge";
import { googleCalendarUrl, platformName } from "@/domain/corridas/links";
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

  const canRegister = !race.isPast && race.registrationStatus === "ABERTAS";
  const platform = platformName(race.registrationUrl);

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
          {race.isPast && (
            <p className="rounded-xl bg-asfalto-100 p-3 text-sm text-asfalto-700">
              Esta prova já aconteceu. Correu? Em breve você poderá avaliar e enviar sua comprovação.
            </p>
          )}
          {!race.isPast && (
            <div className="flex gap-2 text-sm md:hidden">
              <a href={googleCalendarUrl(race, siteUrl)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-white px-2 py-2 text-center ring-1 ring-asfalto-300">
                + Google Agenda
              </a>
              <a href={`/corrida/${race.slug}/agenda.ics`} className="flex-1 rounded-lg bg-white px-2 py-2 text-center ring-1 ring-asfalto-300">
                Baixar .ics
              </a>
            </div>
          )}
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
        <aside className="fixed inset-x-0 bottom-14 z-30 space-y-2 border-t border-asfalto-100 bg-white p-3 md:static md:self-start md:rounded-2xl md:border-0 md:p-4 md:ring-1 md:ring-asfalto-100">
          <div className="hidden md:block">
            {race.isPast ? <PastBadge /> : <StatusBadge status={race.registrationStatus} />}
          </div>
          {race.couponCode && !race.isPast && (
            <div className="rounded-xl border border-dashed border-emerald-600 bg-emerald-50 p-2 text-center text-sm">
              Cupom Largadia{race.couponLabel ? ` (${race.couponLabel})` : ""}:{" "}
              <strong className="font-mono tracking-wider select-all">{race.couponCode}</strong>
            </div>
          )}
          <a
            href={`/ir/${race.slug}`}
            target="_blank"
            rel="noopener nofollow"
            className={`block rounded-xl px-4 py-3 text-center font-semibold ${
              canRegister ? "bg-largada-500 text-asfalto-950 hover:bg-largada-600" : "bg-asfalto-100 text-asfalto-700"
            }`}
          >
            {canRegister ? (platform ? `Inscreva-se na ${platform} ↗` : "Ir para inscrição ↗") : "Ver site oficial ↗"}
          </a>
          {!race.isPast && (
            <div className="hidden grid-cols-2 gap-2 text-sm md:grid">
              <a
                href={googleCalendarUrl(race, siteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-2 py-2 text-center ring-1 ring-asfalto-300 hover:bg-asfalto-50"
              >
                Google Agenda
              </a>
              <a href={`/corrida/${race.slug}/agenda.ics`} className="rounded-lg px-2 py-2 text-center ring-1 ring-asfalto-300 hover:bg-asfalto-50">
                Baixar .ics
              </a>
            </div>
          )}
          <p className="hidden text-xs text-asfalto-500 md:block">A inscrição é feita no site oficial do organizador.</p>
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
