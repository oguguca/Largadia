"use client";

import { useState } from "react";

const label = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Barras verticais de uma série só, com tooltip por barra e tabela como alternativa acessível. */
export function ClicksChart({ series }: { series: { day: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((s, d) => s + d.count, 0);
  const active = hover !== null ? series[hover] : null;

  return (
    <div>
      <div className="mb-2 flex h-5 items-baseline gap-2 text-sm">
        {active ? (
          <>
            <span className="font-semibold tabular-nums">{active.count.toLocaleString("pt-BR")} clique(s)</span>
            <span className="text-asfalto-500">em {label(active.day)}</span>
          </>
        ) : (
          <span className="text-asfalto-500">{total ? `Pico: ${max.toLocaleString("pt-BR")} em um dia` : "Nenhum clique no período ainda."}</span>
        )}
      </div>

      <div className="relative h-40 border-b border-asfalto-300" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-asfalto-100" aria-hidden />
        <div className="flex h-full items-end gap-[2px]" role="img" aria-label={`Cliques por dia nos últimos ${series.length} dias, total ${total}`}>
          {series.map((d, i) => (
            <div
              key={d.day}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              aria-label={`${label(d.day)}: ${d.count} clique(s)`}
            >
              <div
                className={`w-full rounded-t-[4px] ${hover === i ? "bg-largada-500" : "bg-largada-600"}`}
                style={{ height: d.count ? `${Math.max(3, (d.count / max) * 100)}%` : "0" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-asfalto-500 tabular-nums">
        <span>{label(series[0].day)}</span>
        <span>{label(series[Math.floor(series.length / 2)].day)}</span>
        <span>{label(series[series.length - 1].day)}</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-asfalto-500 hover:text-asfalto-900">Ver em tabela</summary>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {series
              .filter((d) => d.count)
              .map((d) => (
                <tr key={d.day} className="border-b border-asfalto-100 last:border-0">
                  <td className="py-1">{label(d.day)}</td>
                  <td className="py-1 text-right tabular-nums">{d.count.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
