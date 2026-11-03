import { Paged } from "@/components/paged";
import { chunk } from "@/lib/chunk";
import type { RankingRow } from "@/domain/pontos/ranking";

/** Coroa do líder do ranking. */
function Crown({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5L3 8z" fill="currentColor" />
      <path
        d="M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Tabela do ranking de pontos. O 1º colocado leva nome colorido e coroa.
 * `viewerId` marca a linha de quem está vendo; `viewer` acrescenta essa linha quando está fora do topo.
 */
export function RankingTable({
  rows,
  viewerId = null,
  viewer = null,
  empty,
  footer,
  pageSize,
}: {
  rows: RankingRow[];
  viewerId?: string | null;
  viewer?: RankingRow | null;
  empty: React.ReactNode;
  /** Linha extra embaixo da tabela, como um convite para entrar no ranking */
  footer?: React.ReactNode;
  /** Com mais linhas que isso, a tabela vira páginas com setas (10 posições por página) */
  pageSize?: number;
}) {
  if (!rows.length && !pageSize) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">
        {empty}
      </div>
    );
  }
  const meId = viewer?.userId ?? viewerId;
  const viewerOutside = viewer && !rows.some((r) => r.userId === viewer.userId);
  const table = (
    pageRows: RankingRow[],
    last: boolean,
    firstPosition: number,
  ) => (
    <div className="h-full overflow-x-auto rounded-2xl bg-white ring-1 ring-asfalto-100">
      {/* Com vagas fixas, a tabela ocupa a altura da coluna e as linhas se dividem por igual */}
      <table className={`w-full text-left text-sm ${pageSize ? "h-full" : ""}`}>
        <thead className="border-b border-asfalto-100 text-asfalto-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Posição
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Corredor
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Provas
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-semibold sm:table-cell"
            >
              Km
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Pontos
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-asfalto-100">
          {pageRows.map((r) => (
            <RankRow key={r.userId} row={r} me={r.userId === meId} />
          ))}
          {/* Quem está vendo e ficou fora do que foi carregado aparece no fim da última página */}
          {last && viewerOutside && <RankRow row={viewer} me />}
          {/* Vagas livres até completar a página: a tabela mantém sempre o mesmo tamanho */}
          {pageSize &&
            Array.from(
              {
                length: Math.max(
                  0,
                  pageSize - pageRows.length - (last && viewerOutside ? 1 : 0),
                ),
              },
              (_, i) => (
                <tr key={`vaga-${i}`} className="text-asfalto-300">
                  <td className="px-4 py-2.5 font-display text-2xl font-extrabold tabular-nums">
                    {firstPosition + pageRows.length + i}º
                  </td>
                  <td className="px-4 py-2.5">
                    {!rows.length && i === 0 ? (
                      <span className="text-asfalto-500">{empty}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">—</td>
                  <td className="hidden px-4 py-2.5 text-right sm:table-cell">
                    —
                  </td>
                  <td className="px-4 py-2.5 text-right">—</td>
                </tr>
              ),
            )}
        </tbody>
      </table>
      {footer && (
        <div className="border-t border-asfalto-100 px-4 py-3 text-sm">
          {footer}
        </div>
      )}
    </div>
  );

  if (!pageSize)
    return <div className="flex-1">{table(rows, true, 1)}</div>;
  const pages = chunk(rows, pageSize);
  return (
    <Paged
      pages={pages.map((p, i) => (
        <div key={i} className="h-full">
          {table(p, i === pages.length - 1, i * pageSize + 1)}
        </div>
      ))}
      total={rows.length}
      pageSize={pageSize}
      noun="Posições"
    />
  );
}

function RankRow({ row, me }: { row: RankingRow; me: boolean }) {
  const leader = row.position === 1;
  const podium = ["text-largada-500", "text-asfalto-500", "text-largada-700"][
    row.position - 1
  ];
  return (
    <tr
      className={
        me ? "bg-pace-500/25" : leader ? "bg-largada-100/50" : undefined
      }
    >
      <td
        className={`px-4 py-2.5 font-display text-2xl font-extrabold tabular-nums ${podium ?? "text-asfalto-300"}`}
      >
        {row.position}º
      </td>
      <th scope="row" className="px-4 py-2.5 font-semibold">
        {/* Coroa, nome e etiqueta "você" centralizados na mesma linha */}
        <span className="inline-flex items-center gap-2">
          {leader && (
            <Crown className="size-5 shrink-0 text-amber-400 drop-shadow-sm" />
          )}
          {leader ? (
            <span className="bg-gradient-to-r from-largada-600 to-amber-500 bg-clip-text font-display text-lg leading-none font-extrabold text-transparent">
              {row.name}
            </span>
          ) : (
            <span className="leading-none">{row.name}</span>
          )}
          {leader && <span className="sr-only">(líder do ranking)</span>}
          {me && (
            <span className="rounded-full bg-asfalto-950 px-2 py-0.5 text-xs leading-none font-semibold text-white">
              você
            </span>
          )}
        </span>
      </th>
      <td className="px-4 py-2.5 text-right tabular-nums">{row.races}</td>
      <td className="hidden px-4 py-2.5 text-right tabular-nums sm:table-cell">
        {row.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      </td>
      <td className="px-4 py-2.5 text-right font-display text-xl font-bold tabular-nums">
        {row.points.toLocaleString("pt-BR")}
      </td>
    </tr>
  );
}
