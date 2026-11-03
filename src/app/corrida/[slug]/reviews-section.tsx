import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { currentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, formatDistance } from "@/lib/format";
import { Stars } from "@/components/biblioteca/stars";
import { getRaceReviews } from "@/domain/biblioteca/queries";
import { addRaceToShelf } from "@/app/minhas-corridas/actions";

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota média, médias por critério e comentários de quem correu. Só para provas que já aconteceram. */
export async function ReviewsSection({ race }: { race: { id: string; slug: string } }) {
  const reviews = await getRaceReviews(race.id);
  return (
    <section aria-labelledby="avaliacoes" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="avaliacoes" className="font-display text-xl font-bold uppercase">
          Avaliações de quem correu
        </h2>
        <Suspense fallback={null}>
          <ShelfButton race={race} />
        </Suspense>
      </div>

      {reviews.count && reviews.average !== null ? (
        <div className="grid gap-6 rounded-2xl bg-white p-5 ring-1 ring-asfalto-100 sm:grid-cols-[10rem_1fr]">
          <div>
            <p className="font-display text-6xl leading-none font-extrabold tabular-nums">{decimal(reviews.average)}</p>
            <Stars value={reviews.average} className="mt-2 h-5 w-5" />
            <p className="mt-1 text-sm text-asfalto-500">
              {reviews.count} {reviews.count === 1 ? "avaliação" : "avaliações"}
            </p>
          </div>
          <dl className="grid content-center gap-2">
            {reviews.criteria.map((c) => (
              <div key={c.key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
                <dt className="text-asfalto-700">{c.label}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-asfalto-100">
                  {c.average !== null && <div className="h-full rounded-full bg-largada-500" style={{ width: `${(c.average / 5) * 100}%` }} />}
                </dd>
                <dd className="text-right font-semibold tabular-nums">{c.average !== null ? decimal(c.average) : "–"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-5 text-sm text-asfalto-500 ring-1 ring-asfalto-100">
          Ainda sem avaliações. Correu esta prova? Coloque nas suas corridas e dê a primeira nota.
        </p>
      )}

      {reviews.comments.length > 0 && (
        <ul className="divide-y divide-asfalto-100 rounded-2xl bg-white px-5 ring-1 ring-asfalto-100">
          {reviews.comments.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Stars value={c.rating} className="h-4 w-4" />
                <span className="font-semibold">{c.author}</span>
                <span className="text-asfalto-500">
                  {c.distanceKm !== null && `${formatDistance(c.distanceKm)} · `}
                  {formatDateShort(c.updatedAt)}
                </span>
              </div>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-asfalto-800">{c.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Botão que depende de quem vê: entrar, adicionar à estante ou editar a avaliação. */
async function ShelfButton({ race }: { race: { id: string; slug: string } }) {
  await connection();
  const session = await currentSession();
  const userId = session?.user?.id;
  const button = "rounded-xl px-4 py-2 text-sm font-semibold";
  if (!userId) {
    return (
      <Link href={`/entrar?voltar=/corrida/${race.slug}`} className={`${button} bg-asfalto-950 text-white hover:bg-asfalto-800`}>
        Entrar para avaliar
      </Link>
    );
  }
  const log = await db.runLog.findUnique({ where: { userId_raceId: { userId, raceId: race.id } }, select: { id: true, rating: true } });
  if (log) {
    return (
      <Link href={`/minhas-corridas/${log.id}`} className={`${button} ring-1 ring-asfalto-300 hover:bg-asfalto-50`}>
        {log.rating ? "Editar minha avaliação" : "Avaliar esta prova"}
      </Link>
    );
  }
  return (
    <form action={addRaceToShelf.bind(null, race.id, race.slug)}>
      <button className={`${button} bg-largada-500 text-asfalto-950 hover:bg-largada-600`}>Adicionar às minhas corridas</button>
    </form>
  );
}
