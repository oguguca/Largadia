"use client";

import { useState } from "react";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2 text-sm";

/**
 * Imagem do prêmio: arquivo do computador (vai junto com o formulário) ou um link.
 * Mostra a prévia do que vai aparecer no cartão do sorteio.
 */
export function ImageField({ initialUrl, error }: { initialUrl: string; error?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? (url || null);

  return (
    <fieldset className="space-y-2 md:col-span-2">
      <legend className="text-sm font-semibold text-asfalto-700">Imagem do prêmio (opcional)</legend>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-asfalto-100 ring-1 ring-asfalto-100">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local ou de link arbitrário
            <img src={shown} alt="Prévia da imagem do prêmio" className="h-full w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-xs text-asfalto-500">Sem imagem</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-asfalto-700">Escolher do computador</span>
            <input
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-asfalto-950 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-asfalto-800"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <span className="block text-xs text-asfalto-500">JPG, PNG ou WebP até 3,5 MB. É reduzida automaticamente.</span>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-asfalto-700">Ou cole um link</span>
            <input name="imageUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={field} />
            <span className="block text-xs text-asfalto-500">Se escolher um arquivo, ele substitui o link.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </fieldset>
  );
}
