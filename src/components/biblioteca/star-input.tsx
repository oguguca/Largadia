"use client";

import { useState } from "react";
import { STAR } from "./stars";

const words = ["", "Ruim", "Fraca", "Boa", "Muito boa", "Excelente"];

/**
 * Nota de 1 a 5 por estrelas. Por baixo são botões de rádio (teclado e leitor de tela funcionam);
 * o valor vai no formulário pelo campo `name`. `optional` mostra "Limpar" para tirar a nota.
 */
export function StarInput({
  name,
  label,
  defaultValue,
  optional = false,
  size = "h-8 w-8",
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  optional?: boolean;
  size?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold text-asfalto-700">{label}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => setValue(n)}
                className="peer sr-only"
              />
              <svg
                viewBox="0 0 24 24"
                className={`${size} rounded transition peer-focus-visible:ring-2 peer-focus-visible:ring-largada-500 ${
                  n <= shown ? "fill-largada-500" : "fill-asfalto-300"
                }`}
                aria-hidden
              >
                <path d={STAR} />
              </svg>
              <span className="sr-only">
                {n} {n === 1 ? "estrela" : "estrelas"}
              </span>
            </label>
          ))}
        </div>
        <span className="text-sm text-asfalto-500">{words[shown] ?? ""}</span>
        {/* Sem nota marcada, o campo vai vazio */}
        {value === 0 && <input type="hidden" name={name} value="" />}
        {optional && value > 0 && (
          <button type="button" onClick={() => setValue(0)} className="text-xs text-asfalto-500 underline hover:text-asfalto-900">
            Limpar
          </button>
        )}
      </div>
    </fieldset>
  );
}
