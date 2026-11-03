import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateShort } from "@/lib/format";
import { Stars } from "@/components/biblioteca/stars";
import { setReviewHidden } from "./actions";

const tabSchema = z.enum(["visiveis", "escondidas"]).catch("visiveis");

/** Avaliações com comentário que aparecem na página das provas. O admin esconde o que for ofensivo ou não for da prova. */
export default async function AdminAvaliacoesPage(props: PageProps<"/admin/avaliacoes">) {
  await requireAdmin();
  await connection();
  const tab = tabSchema.parse((await props.searchParams).aba);
  const base = { raceId: { not: null }, rating: { not: null }, comment: { not: null } };
  const [reviews, visible, hidden] = await Promise.all([
    db.runLog.findMany({
      where: { ...base, hiddenAt: tab === "escondidas" ? { not: null } : null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } }, race: { select: { name: true, slug: true } } },
    }),
    db.runLog.count({ where: { ...base, hiddenAt: null } }),
    db.runLog.count({ where: { ...base, hiddenAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Avaliações</h1>
        <p className="text-sm text-asfalto-500">
          Comentários de “Minhas corridas” que aparecem na página das provas. Esconda o que for ofensivo, propaganda ou de outra prova; a
          avaliação continua na estante de quem escreveu.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["visiveis", `No site (${visible})`],
            ["escondidas", `Escondidas (${hidden})`],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/avaliacoes?aba=${key}`}
            className={`rounded-full px-3 py-1 text-sm ${key === tab ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-asfalto-100">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating!} />
                  {r.race && (
                    <Link href={`/corrida/${r.race.slug}#avaliacoes`} className="font-semibold hover:text-largada-600">
                      {r.race.name}
                    </Link>
                  )}
                </span>
                <span className="text-asfalto-500">
                  {r.user.name} · {r.user.email} · {formatDateShort(r.updatedAt)}
                </span>
              </div>
              <p className="whitespace-pre-line text-asfalto-800">{r.comment}</p>
              <form action={setReviewHidden.bind(null, r.id, !r.hiddenAt)}>
                <button className="rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-asfalto-300 hover:bg-asfalto-50">
                  {r.hiddenAt ? "Mostrar de novo" : "Esconder do site"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
          {tab === "escondidas" ? "Nenhuma avaliação escondida." : "Nenhum comentário ainda."}
        </p>
      )}
    </div>
  );
}
