"use client";

import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "../bookmarklet";

export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    // O React bloqueia href "javascript:" no JSX, então o link é montado direto no DOM
    ref.current?.setAttribute("href", buildBookmarklet(window.location.origin));
  }, []);

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-asfalto-100">
      <p className="font-display text-lg font-bold uppercase">Botão do navegador</p>
      <p className="text-asfalto-700">
        Importa tudo o que a página da prova mostra, inclusive distâncias, descrição e preço quando aparece. Arraste o botão abaixo para
        a barra de favoritos. Depois, na página da prova (Ticket Sports ou outra plataforma), clique nele.
      </p>
      <a
        ref={ref}
        onClick={(e) => {
          e.preventDefault();
          setClicked(true);
        }}
        className="inline-block cursor-grab rounded-lg bg-largada-500 px-4 py-2 font-semibold text-asfalto-950"
      >
        Enviar ao Largadia
      </a>
      {clicked && (
        <p role="status" className="rounded-lg bg-largada-100 p-2 text-largada-700">
          Aqui ele não faz nada. Segure e arraste o botão até a barra de favoritos (Ctrl+Shift+B mostra a barra). Depois abra a página
          da prova na Ticket Sports e clique no favorito.
        </p>
      )}
    </div>
  );
}
