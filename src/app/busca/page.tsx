import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { parseSearchFilters, toQueryString, type SearchFilters } from "@/domain/corridas/filtros";
import { searchRaces } from "@/domain/corridas/queries";
import { RaceGrid } from "@/components/corridas/race-card";
import { RaceMapLazy } from "@/components/corridas/race-map-lazy";
import { toMapRaces } from "@/components/corridas/to-map";
import { SearchFiltersForm } from "@/components/corridas/search-filters";

export const metadata: Metadata = {
  title: "Buscar corridas de rua",
  description: "Filtre corridas de rua por cidade, estado, distância, data, preço e tipo de prova.",
  alternates: { canonical: "/busca" },
};

export default function BuscaPage(props: PageProps<"/busca">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-3xl font-extrabold italic uppercase">Encontre sua corrida</h1>
      <Suspense fallback={<p className="text-asfalto-500">Carregando corridas…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/busca">["searchParams"] }) {
  const filters = parseSearchFilters(await searchParams);
  await connection();
  const result = await searchRaces(filters, new Date());
  // Página e visualização não contam como filtro
  const hasFilters = toQueryString(filters, { pagina: 1, view: "lista" }) !== "";

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <aside>
        <details className="group rounded-2xl bg-white p-4 ring-1 ring-asfalto-100 md:open:block" open>
          <summary className="cursor-pointer list-none font-semibold md:hidden">
            Filtros <span className="text-asfalto-500 group-open:hidden">(toque para abrir)</span>
          </summary>
          <div className="mt-4 md:mt-0">
            <SearchFiltersForm filters={filters} />
          </div>
        </details>
      </aside>

      <section aria-live="polite">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-asfalto-500">
            {result.total === 0
              ? "Nenhuma corrida encontrada"
              : `${result.total} corrida${result.total > 1 ? "s" : ""} encontrada${result.total > 1 ? "s" : ""}`}
          </p>
          <ViewToggle filters={filters} />
        </div>

        {filters.view === "mapa" ? (
          <div className="h-[70vh] overflow-hidden rounded-2xl ring-1 ring-asfalto-100">
            <RaceMapLazy
              races={toMapRaces(result.mapItems)}
              center={filters.lat !== undefined && filters.lng !== undefined ? [filters.lat, filters.lng] : undefined}
            />
          </div>
        ) : result.total === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-asfalto-100">
            {hasFilters ? (
              <>
                <p className="font-semibold">Nada por aqui com esses filtros.</p>
                <p className="mt-1 text-sm text-asfalto-500">Tente aumentar o raio, mudar as datas ou remover algum filtro.</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Estamos montando o calendário.</p>
                <p className="mt-1 text-sm text-asfalto-500">As primeiras provas aparecem aqui em breve.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <RaceGrid races={result.items} />
            <Pagination filters={filters} page={result.page} pages={result.pages} />
          </>
        )}
      </section>
    </div>
  );
}

function ViewToggle({ filters }: { filters: SearchFilters }) {
  const base = "rounded-full px-3 py-1 text-sm font-semibold";
  const on = "bg-asfalto-950 text-white";
  const off = "text-asfalto-700 hover:bg-asfalto-100";
  return (
    <div className="flex rounded-full bg-white p-1 ring-1 ring-asfalto-100" role="group" aria-label="Visualização">
      <Link href={`/busca${toQueryString(filters, { view: "lista", pagina: 1 })}`} className={`${base} ${filters.view === "lista" ? on : off}`}>
        Lista
      </Link>
      <Link href={`/busca${toQueryString(filters, { view: "mapa", pagina: 1 })}`} className={`${base} ${filters.view === "mapa" ? on : off}`}>
        Mapa
      </Link>
    </div>
  );
}

function Pagination({ filters, page, pages }: { filters: SearchFilters; page: number; pages: number }) {
  if (pages <= 1) return null;
  const link = "rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-asfalto-300 bg-white";
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginação">
      {page > 1 && (
        <Link href={`/busca${toQueryString(filters, { pagina: page - 1 })}`} className={link}>
          ← Anterior
        </Link>
      )}
      <span className="text-sm text-asfalto-500">
        Página {page} de {pages}
      </span>
      {page < pages && (
        <Link href={`/busca${toQueryString(filters, { pagina: page + 1 })}`} className={link}>
          Próxima →
        </Link>
      )}
    </nav>
  );
}
