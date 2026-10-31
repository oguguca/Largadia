import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCityBySlug, getCityRaces } from "@/domain/corridas/queries";
import { RaceGrid } from "@/components/corridas/race-card";
import { RaceMapLazy } from "@/components/corridas/race-map-lazy";
import { toMapRaces } from "@/components/corridas/to-map";

export async function generateMetadata(props: PageProps<"/corridas/[cidade]">): Promise<Metadata> {
  const { cidade } = await props.params;
  const city = await getCityBySlug(cidade);
  if (!city) return { title: "Cidade não encontrada" };
  return {
    title: `Corridas de rua em ${city.city}/${city.state}`,
    description: `Calendário de corridas de rua em ${city.city}/${city.state}: datas, distâncias, preços e links de inscrição.`,
    alternates: { canonical: `/corridas/${city.citySlug}` },
  };
}

export default function CidadePage(props: PageProps<"/corridas/[cidade]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="text-asfalto-500">Carregando…</p>}>
        <CityRaces params={props.params} />
      </Suspense>
    </div>
  );
}

async function CityRaces({ params }: { params: PageProps<"/corridas/[cidade]">["params"] }) {
  const { cidade } = await params;
  const city = await getCityBySlug(cidade);
  if (!city) notFound();
  const races = await getCityRaces(cidade);

  return (
    <>
      <nav className="mb-1 text-xs text-asfalto-500" aria-label="Trilha">
        <Link href="/busca" className="hover:text-asfalto-900">Corridas</Link> · {city.state}
      </nav>
      <h1 className="font-display text-3xl font-extrabold italic uppercase md:text-4xl">
        Corridas em {city.city}/{city.state}
      </h1>
      <p className="mb-5 text-asfalto-500">
        {races.length === 0
          ? "Nenhuma corrida futura cadastrada por enquanto."
          : `${races.length} prova${races.length > 1 ? "s" : ""} com data marcada.`}
      </p>
      {races.length > 0 && (
        <>
          <div className="mb-6 h-64 overflow-hidden rounded-2xl ring-1 ring-asfalto-100">
            <RaceMapLazy races={toMapRaces(races)} />
          </div>
          <RaceGrid races={races} />
        </>
      )}
      <p className="mt-6 text-sm">
        <Link href={`/busca?cidade=${city.citySlug}`} className="font-semibold text-largada-600 hover:underline">
          Filtrar corridas de {city.city} por distância, data e preço →
        </Link>
      </p>
    </>
  );
}
