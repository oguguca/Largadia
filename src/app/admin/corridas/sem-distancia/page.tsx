import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateShort } from "@/lib/format";
import { UFS } from "@/config/corridas";
import { platformName } from "@/domain/corridas/links";
import { DistanceRow } from "./distance-row";

const PAGE_SIZE = 25;

const filtersSchema = z.object({
  uf: z.enum(UFS).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(200).catch(1).default(1),
});

/**
 * Provas futuras sem distância. A Ticket Sports só mostra distâncias carregando a /api/ dela,
 * que o robots.txt proíbe; então o admin completa à mão, olhando o cartaz ou a página da prova.
 */
export default async function SemDistanciaPage(props: PageProps<"/admin/corridas/sem-distancia">) {
  await requireAdmin();
  const f = filtersSchema.parse(await props.searchParams);
  await connection();
  const where = { distancesKm: { isEmpty: true }, startsAt: { gte: new Date() }, ...(f.uf ? { state: f.uf } : {}) };

  const [total, byState, races] = await Promise.all([
    db.race.count({ where }),
    db.race.groupBy({
      by: ["state"],
      where: { distancesKm: { isEmpty: true }, startsAt: { gte: new Date() } },
      _count: { _all: true },
      orderBy: { _count: { state: "desc" } },
    }),
    db.race.findMany({
      where,
      // As mais próximas primeiro: são as que as pessoas estão procurando agora
      orderBy: { startsAt: "asc" },
      skip: (f.pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, startsAt: true, city: true, state: true, imageUrl: true, registrationUrl: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: { uf?: string | null; pagina?: number }) => {
    const p = new URLSearchParams();
    const uf = over.uf === undefined ? f.uf : over.uf;
    if (uf) p.set("uf", uf);
    if ((over.pagina ?? 1) > 1) p.set("pagina", String(over.pagina));
    const s = p.toString();
    return `/admin/corridas/sem-distancia${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Sem distância</h1>
        <p className="text-sm text-asfalto-500">
          {total} {total === 1 ? "prova futura não tem" : "provas futuras não têm"} distância e não aparecem no filtro de distância da busca.
          Olhe o cartaz (clique para ampliar) ou a página da inscrição, marque as distâncias e salve.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Estados">
        <Link
          href={href({ uf: null })}
          className={`rounded-full px-3 py-1 text-sm ${!f.uf ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
        >
          Todos ({byState.reduce((n, s) => n + s._count._all, 0)})
        </Link>
        {byState.map((s) => (
          <Link
            key={s.state}
            href={href({ uf: s.state })}
            className={`rounded-full px-3 py-1 text-sm tabular-nums ${f.uf === s.state ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
          >
            {s.state} ({s._count._all})
          </Link>
        ))}
      </nav>

      {races.length ? (
        <ul className="space-y-3">
          {races.map((r) => (
            <DistanceRow
              key={r.id}
              race={{
                id: r.id,
                name: r.name,
                dateLabel: formatDateShort(r.startsAt),
                place: `${r.city}/${r.state}`,
                imageUrl: r.imageUrl,
                registrationUrl: r.registrationUrl,
                platform: platformName(r.registrationUrl) ?? null,
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
          Todas as provas futuras{f.uf ? ` de ${f.uf}` : ""} já têm distância.
        </p>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Paginação">
          {f.pagina > 1 && (
            <Link href={href({ pagina: f.pagina - 1 })} className="rounded-lg px-3 py-1.5 ring-1 ring-asfalto-300">
              Anterior
            </Link>
          )}
          <span className="text-asfalto-500">
            Página {f.pagina} de {pages}
          </span>
          {f.pagina < pages && (
            <Link href={href({ pagina: f.pagina + 1 })} className="rounded-lg px-3 py-1.5 ring-1 ring-asfalto-300">
              Próxima
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
