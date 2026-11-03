import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateShort, formatDistance } from "@/lib/format";
import { claimStatusLabels, formatFinishTime } from "@/domain/pontos/pontos";
import { approveClaim, rejectClaim, reopenClaim } from "./actions";

const tabSchema = z.enum(["PENDENTE", "APROVADA", "RECUSADA"]).catch("PENDENTE");

export default async function AdminPontosPage(props: PageProps<"/admin/pontos">) {
  await requireAdmin();
  await connection();
  const status = tabSchema.parse((await props.searchParams).status);
  const [claims, counts] = await Promise.all([
    db.pointClaim.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDENTE" ? "asc" : "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } }, race: { select: { name: true, slug: true, startsAt: true } } },
    }),
    db.pointClaim.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Pontos</h1>
        <p className="text-sm text-asfalto-500">
          Comprovações de “Eu corri”. Abra o link, confira nome, prova e distância, e aprove para os pontos entrarem.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["PENDENTE", "APROVADA", "RECUSADA"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/pontos?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${s === status ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
          >
            {s === "PENDENTE" ? "Para revisar" : claimStatusLabels[s] + "s"} ({count(s)})
          </Link>
        ))}
      </div>

      {claims.length ? (
        <ul className="space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-asfalto-100">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {c.user.name} <span className="font-normal text-asfalto-500">· {c.user.email}</span>
                </p>
                <p className="text-sm font-semibold tabular-nums">{c.points} pontos</p>
              </div>
              <p className="text-sm">
                {c.race ? (
                  <Link href={`/corrida/${c.race.slug}`} target="_blank" className="text-largada-600 hover:underline">
                    {c.race.name}
                  </Link>
                ) : (
                  <>
                    <span className="rounded bg-largada-100 px-1.5 py-0.5 text-xs font-semibold text-largada-700">Fora do calendário</span>{" "}
                    <strong>{c.customRaceName}</strong> ({c.customCity}/{c.customState})
                  </>
                )}{" "}
                · {formatDateShort(c.race?.startsAt ?? c.customRaceDate ?? c.createdAt)} · {formatDistance(c.distanceKm)}
                {c.bibNumber && ` · peito ${c.bibNumber}`} · enviado {formatDateShort(c.createdAt)}
              </p>
              {/* Dados para conferir no resultado oficial */}
              <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-asfalto-50 px-3 py-2 text-sm">
                <div>
                  <dt className="inline text-asfalto-500">Nome no resultado: </dt>
                  <dd className="inline font-semibold">{c.runnerName ?? "não informado"}</dd>
                </div>
                <div>
                  <dt className="inline text-asfalto-500">Peito: </dt>
                  <dd className="inline font-semibold">{c.bibNumber ?? "não informado"}</dd>
                </div>
                <div>
                  <dt className="inline text-asfalto-500">Tempo oficial: </dt>
                  <dd className="inline font-semibold tabular-nums">{c.finishSeconds ? formatFinishTime(c.finishSeconds) : "não informado"}</dd>
                </div>
              </dl>
              <a href={c.proofUrl} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm text-largada-600 underline">
                Abrir comprovante ↗ <span className="text-asfalto-500">{c.proofUrl}</span>
              </a>
              {c.reviewNote && <p className="text-xs text-asfalto-500">Motivo: {c.reviewNote}</p>}

              {c.status === "PENDENTE" ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <form action={approveClaim.bind(null, c.id)}>
                    <button className="rounded-lg bg-pace-500 px-3 py-1.5 text-sm font-semibold">Aprovar</button>
                  </form>
                  <form action={rejectClaim.bind(null, c.id)} className="flex flex-1 gap-2">
                    <input name="note" placeholder="Motivo da recusa (o corredor vê)" maxLength={300} className="min-w-0 flex-1 rounded-lg border border-asfalto-300 px-2 py-1.5 text-sm" />
                    <button className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-asfalto-300">Recusar</button>
                  </form>
                </div>
              ) : (
                <form action={reopenClaim.bind(null, c.id)}>
                  <button className="text-xs text-asfalto-500 underline hover:text-asfalto-900">Voltar para análise</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">Nada por aqui.</p>
      )}
    </div>
  );
}
