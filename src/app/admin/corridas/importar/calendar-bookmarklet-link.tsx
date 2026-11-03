"use client";

import { useEffect, useRef, useState } from "react";
import { buildCalendarBookmarklet } from "../bookmarklet";

export function CalendarBookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    // O React bloqueia href "javascript:" no JSX, então o link é montado direto no DOM
    ref.current?.setAttribute("href", buildCalendarBookmarklet(window.location.origin));
  }, []);

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-asfalto-100">
      <p className="font-display text-lg font-bold uppercase">Calendário inteiro (Ticket Sports ou Yescom)</p>
      <ol className="list-decimal space-y-1 pl-5 text-asfalto-700">
        <li>Arraste o botão abaixo para a barra de favoritos (Ctrl+Shift+B mostra a barra).</li>
        <li>
          Abra{" "}
          <a href="https://www.ticketsports.com.br/calendar/filters" target="_blank" rel="noreferrer" className="underline">
            o calendário da Ticket Sports
          </a>{" "}
          (escolha a modalidade <strong>Corridas</strong> e clique em “Carregar mais eventos” até aparecer tudo) ou{" "}
          <a href="https://www.yescom.com.br/site/calendarioYescomnovo2026.html" target="_blank" rel="noreferrer" className="underline">
            o calendário da Yescom
          </a>{" "}
          (troque o ano no topo para ver as provas de 2027).
        </li>
        <li>Clique no favorito. O Largadia abre com a lista para você conferir e publicar.</li>
      </ol>
      <a
        ref={ref}
        onClick={(e) => {
          e.preventDefault();
          setClicked(true);
        }}
        className="inline-block cursor-grab rounded-lg bg-largada-500 px-4 py-2 font-semibold text-asfalto-950"
      >
        Enviar calendário ao Largadia
      </a>
      {clicked && (
        <p role="status" className="rounded-lg bg-largada-100 p-2 text-largada-700">
          Aqui ele não faz nada. Segure e arraste o botão até a barra de favoritos e use no calendário da Ticket Sports.
        </p>
      )}
    </div>
  );
}
