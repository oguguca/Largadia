import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMonthRaces, type RaceCard as RaceCardData } from "@/domain/corridas/queries";
import { RaceCard } from "@/components/corridas/race-card";
import { MONTH_LABELS, monthPath, parseMonth, shiftMonth } from "@/lib/months";
import { formatDateLong, formatDateShort } from "@/lib/format";

type Props = PageProps<"/calendario/[ano]/[mes]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { ano, mes } = await props.params;
  const m = parseMonth(ano, mes);
  if (!m) return { title: "Calendário" };
  const label = `${MONTH_LABELS[m.month - 1]} de ${m.year}`;
  return {
    title: `Corridas de rua em ${label}`,
    description: `Calendário de corridas de rua no Brasil em ${label}: datas, cidades, distâncias e links de inscrição.`,
    alternates: { canonical: monthPath(m.year, m.month) },
  };
}

export default function CalendarioMesPage(props: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<p className="text-asfalto-500">Carregando calendário…</p>}>
        <Month params={props.params} />
      </Suspense>
    </div>
  );
}

async function Month({ params }: { params: Props["params"] }) {
  const { ano, mes } = await params;
  const m = parseMonth(ano, mes);
  if (!m) notFound();
  const races = await getMonthRaces(m.year, m.month);
  const prev = shiftMonth(m.year, m.month, -1);
  const next = shiftMonth(m.year, m.month, 1);

  // Agrupa por dia (rótulo por extenso em horário de Brasília)
  const days = new Map<string, RaceCardData[]>();
  for (const r of races) {
    const key = formatDateLong(r.startsAt);
    days.set(key, [...(days.get(key) ?? []), r]);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-2">
        <Link href={monthPath(prev.year, prev.month)} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-asfalto-300 capitalize">
          ← {MONTH_LABELS[prev.month - 1]}
        </Link>
        <h1 className="text-center font-display text-3xl font-extrabold italic uppercase">
          {MONTH_LABELS[m.month - 1]} {m.year}
        </h1>
        <Link href={monthPath(next.year, next.month)} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-asfalto-300 capitalize">
          {MONTH_LABELS[next.month - 1]} →
        </Link>
      </div>
      {races.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
          Nenhuma corrida cadastrada neste mês ainda.
        </p>
      ) : (
        <ol className="space-y-8">
          {[...days].map(([day, list]) => (
            <li key={day}>
              <DayHeading label={day} date={list[0].startsAt} count={list.length} />
              <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {list.map((r) => (
                  <li key={r.id} className="flex">
                    <RaceCard race={r} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/** Cabeçalho do dia: número grande e dia da semana, preso no topo enquanto rola as provas do dia. */
function DayHeading({ label, date, count }: { label: string; date: Date; count: number }) {
  const [day, month] = formatDateShort(date).split(" de ");
  const weekday = label.split(",")[0];
  return (
    <h2 className="sticky top-14 z-10 -mx-4 mb-3 flex items-baseline gap-3 border-b border-asfalto-100 bg-asfalto-50/95 px-4 py-2 backdrop-blur">
      <span aria-hidden className="font-display text-4xl leading-none font-extrabold text-largada-600 tabular-nums">
        {day}
      </span>
      <span aria-hidden className="font-display text-xl font-bold uppercase">
        {month} <span className="ml-1 text-asfalto-500 capitalize">{weekday}</span>
      </span>
      <span className="ml-auto text-sm font-normal text-asfalto-500">
        {count} {count === 1 ? "prova" : "provas"}
      </span>
      <span className="sr-only">{label}</span>
    </h2>
  );
}
