"use client";

import { useState } from "react";

/**
 * Mostra uma página por vez, com setas para avançar e voltar. As páginas chegam prontas do servidor
 * (já fatiadas), então aqui só se troca qual aparece. `total` e `pageSize` montam o "11–20 de 34".
 */
export function Paged({
  pages,
  total,
  pageSize,
  noun,
}: {
  pages: React.ReactNode[];
  total: number;
  pageSize: number;
  /** Ex.: "posições", "corridas" */
  noun: string;
}) {
  const [page, setPage] = useState(0);
  // As setas ficam sempre à vista (apagadas quando não há para onde ir), para o layout não mudar
  const from = page * pageSize + 1;
  const to = page * pageSize + pageSize;
  const arrow =
    "grid size-9 place-items-center rounded-lg bg-white text-xl leading-none font-bold text-asfalto-950 ring-1 ring-asfalto-300 hover:bg-largada-500 hover:ring-largada-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white disabled:hover:ring-asfalto-300";
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">{pages[page]}</div>
      <div className="mt-3 flex items-center justify-end gap-3 text-sm">
        <span className="text-asfalto-500 tabular-nums" aria-live="polite">
          {noun} {from}–{to}
          {total > pageSize && ` de ${total}`}
        </span>
        <button type="button" className={arrow} onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Anteriores">
          ‹
        </button>
        <button
          type="button"
          className={arrow}
          onClick={() => setPage((p) => p + 1)}
          disabled={page === pages.length - 1}
          aria-label="Próximas"
        >
          ›
        </button>
      </div>
    </div>
  );
}
