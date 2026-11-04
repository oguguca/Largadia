"use client";

import { useActionState, useRef } from "react";
import { saveRunPhoto } from "../actions";

/** Foto da capa: escolher o arquivo já envia. Sem foto, a capa usa o cartaz da prova ou a capa com o nome. */
export function PhotoForm({ id, hasPhoto, hasPoster }: { id: string; hasPhoto: boolean; hasPoster: boolean }) {
  const [state, action, pending] = useActionState(saveRunPhoto.bind(null, id), null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer font-semibold text-largada-600 hover:underline ${pending ? "pointer-events-none opacity-60" : ""}`}>
          {pending ? "Enviando…" : hasPhoto ? "Trocar foto" : "Enviar foto da corrida"}
          <input
            type="file"
            name="foto"
            accept="image/*"
            className="sr-only"
            disabled={pending}
            onChange={(e) => e.currentTarget.files?.length && form.current?.requestSubmit()}
          />
        </label>
        {hasPhoto && (
          <button name="remover" value="1" disabled={pending} className="text-asfalto-500 underline hover:text-asfalto-900">
            Tirar foto
          </button>
        )}
      </div>
      {!hasPhoto && (
        <p className="text-xs text-asfalto-500">
          Medalha, largada, chegada: a foto vira a capa{hasPoster ? " no lugar do cartaz" : ""} e aparece só na sua estante.
        </p>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
