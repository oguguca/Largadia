import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateShort } from "@/lib/format";
import { flags } from "@/config/flags";
import { raffleStatusLabels } from "@/domain/sorteios/sorteio";

const statusStyle = {
  RASCUNHO: "bg-asfalto-100 text-asfalto-700",
  ABERTO: "bg-pace-500/30 text-asfalto-900",
  ENCERRADO: "bg-largada-100 text-largada-700",
  SORTEADO: "bg-asfalto-950 text-white",
} as const;

export default async function AdminSorteiosPage(props: PageProps<"/admin/sorteios">) {
  await requireAdmin();
  await connection();
  const sp = await props.searchParams;
  const raffles = await db.raffle.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { _count: { select: { entries: true } }, winner: { select: { name: true } }, race: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Sorteios</h1>
        <Link href="/admin/sorteios/novo" className="rounded-xl bg-largada-500 px-4 py-2 text-sm font-semibold text-asfalto-950 hover:bg-largada-600">
          + Novo sorteio
        </Link>
      </div>

      {!flags.sorteiosAtivos && (
        <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
          A página pública de sorteios está desligada (<code>sorteiosAtivos</code> em <code>src/config/flags.ts</code>). Sorteios ligados a
          assinatura precisam de autorização prévia da SPA/MF. Você pode preparar os sorteios aqui; os corredores só participam depois
          que a flag for ligada.
        </p>
      )}
      {sp.salvo && <p className="rounded-lg bg-pace-500/20 p-3 text-sm">Sorteio salvo.</p>}
      {sp.removido && <p className="rounded-lg bg-asfalto-100 p-3 text-sm">Sorteio removido.</p>}

      {raffles.length ? (
        <ul className="divide-y divide-asfalto-100 overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100">
          {raffles.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/sorteios/${r.id}`} className="font-medium hover:text-largada-600">
                  {r.title}
                </Link>
                <p className="text-xs text-asfalto-500">
                  {r.prize} · {r.entriesCloseAt ? `até ${formatDateShort(r.entriesCloseAt)}` : "sem data (encerramento manual)"} · {r._count.entries}{" "}
                  participante(s)
                  {r.premiumOnly && " · Premium"}
                  {r.race && ` · ${r.race.name}`}
                  {r.winner && ` · 🏆 ${r.winner.name}`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[r.status]}`}>{raffleStatusLabels[r.status]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
          Nenhum sorteio ainda. Crie o primeiro em “Novo sorteio”.
        </p>
      )}
    </div>
  );
}
