import Link from "next/link";
import { Suspense } from "react";
import {
  getCitiesWithRaces,
  getFeaturedRaces,
  getOpeningSoonRaces,
  getUpcomingRaces,
  getWeekendRaces,
} from "@/domain/corridas/queries";
import { RaceGrid } from "@/components/corridas/race-card";
import { NearbyRaces } from "@/components/corridas/nearby-races";
import { slogan } from "@/lib/site";
import { cacheLife } from "next/cache";
import { MONTH_LABELS, monthPath } from "@/lib/months";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-asfalto-950 text-white">
        <div className="faixa-largada absolute inset-x-0 bottom-0 h-2 opacity-90" aria-hidden />
        <div className="absolute -top-20 -right-24 h-80 w-80 rounded-full bg-largada-500/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-16 md:pb-20">
          <p className="mb-2 text-sm font-semibold tracking-widest text-pace-500 uppercase">Agenda de corridas de rua</p>
          <h1 className="max-w-2xl font-display text-5xl leading-[0.9] font-extrabold italic uppercase md:text-7xl">
            {slogan}
          </h1>
          <form action="/busca" className="mt-6 flex max-w-xl gap-2 rounded-2xl bg-white p-1.5">
            <label htmlFor="q" className="sr-only">
              Buscar corrida
            </label>
            <input
              id="q"
              name="q"
              placeholder="Cidade, prova ou organizador"
              className="min-w-0 flex-1 rounded-xl px-3 text-asfalto-950 outline-none"
            />
            <button className="rounded-xl bg-largada-500 px-5 py-3 font-semibold text-asfalto-950 hover:bg-largada-600">
              Buscar
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {[
              ["5k", "/busca?dist=ate-5"],
              ["10k", "/busca?dist=6-10"],
              ["Meia maratona", "/busca?dist=11-21"],
              ["Maratona", "/busca?dist=22-42"],
              ["Trail", "/busca?tipo=TRAIL"],
              ["Noturnas", "/busca?tipo=NOTURNA"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full border border-white/20 px-3 py-1 hover:border-pace-500 hover:text-pace-500">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <Suspense>
          <Featured />
        </Suspense>

        <Section title="Largadas deste fim de semana" href="/busca">
          <Suspense fallback={<GridSkeleton />}>
            <WeekendRaces />
          </Suspense>
        </Section>

        <Section title="Inscrições abrindo em breve">
          <Suspense fallback={<GridSkeleton />}>
            <OpeningSoon />
          </Suspense>
        </Section>

        <Section title="Provas perto de você">
          <NearbyRaces />
        </Section>

        <Section title="Calendário" href="/calendario">
          <MonthLinks />
        </Section>

        <Section title="Corridas por cidade">
          <Suspense fallback={<GridSkeleton />}>
            <Cities />
          </Suspense>
        </Section>

        <section className="overflow-hidden rounded-3xl bg-asfalto-950 p-6 text-white md:flex md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Organiza uma corrida?</h2>
            <p className="mt-1 text-asfalto-300">Cadastre sua prova de graça e alcance corredores da sua região.</p>
          </div>
          <Link
            href="/organizadores"
            className="mt-4 inline-block rounded-full bg-pace-500 px-6 py-3 font-semibold text-asfalto-950 hover:bg-pace-600 md:mt-0"
          >
            Cadastrar corrida
          </Link>
        </section>
      </div>
    </>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold uppercase md:text-3xl">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-largada-600 hover:underline">
            Ver todas
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

async function Featured() {
  const races = await getFeaturedRaces();
  if (!races.length) return null;
  return (
    <Section title="Em destaque">
      <RaceGrid races={races} />
    </Section>
  );
}

async function WeekendRaces() {
  const weekend = await getWeekendRaces();
  if (weekend.length) return <RaceGrid races={weekend} />;
  // Sem provas no fim de semana: mostra as próximas para a seção não ficar vazia
  const next = await getUpcomingRaces(4);
  return (
    <>
      <p className="mb-3 text-sm text-asfalto-500">Nenhuma largada neste fim de semana. Veja as próximas:</p>
      <RaceGrid races={next} />
    </>
  );
}

async function OpeningSoon() {
  const races = await getOpeningSoonRaces();
  if (!races.length) return <p className="text-asfalto-500">Nenhuma inscrição prevista para abrir em breve.</p>;
  return <RaceGrid races={races} />;
}

async function Cities() {
  const cities = await getCitiesWithRaces();
  return (
    <ul className="flex flex-wrap gap-2">
      {cities.slice(0, 24).map((c) => (
        <li key={c.citySlug}>
          <Link
            href={`/corridas/${c.citySlug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-asfalto-100 hover:ring-largada-500"
          >
            {c.city}/{c.state}
            <span className="rounded-full bg-asfalto-100 px-1.5 text-xs font-semibold">{c.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Atalhos para os próximos 6 meses. Datas fixas no build são aceitáveis: a página revalida a cada hora. */
async function MonthLinks() {
  "use cache";
  cacheLife("hours");
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  });
  return (
    <ul className="flex flex-wrap gap-2">
      {months.map((m) => (
        <li key={`${m.year}-${m.month}`}>
          <Link
            href={monthPath(m.year, m.month)}
            className="inline-block rounded-full bg-white px-3 py-1.5 text-sm capitalize ring-1 ring-asfalto-100 hover:ring-largada-500"
          >
            {MONTH_LABELS[m.month - 1]} {m.year}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-asfalto-100 sm:h-64" />
      ))}
    </div>
  );
}
