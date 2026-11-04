"use client";

import { useState } from "react";
import { STAR } from "./stars";

const words = ["", "Ruim", "Fraca", "Boa", "Muito boa", "Excelente"];
/** "3,5 · Boa": a palavra é da estrela inteira alcançada (meia estrela sozinha conta como "Ruim"). */
const label = (v: number, withWord: boolean) =>
  v ? `${v.toLocaleString("pt-BR")}${withWord ? ` · ${words[Math.max(1, Math.floor(v))]}` : ""}` : "";

/**
 * Nota de 0,5 a 5 por estrelas: a metade esquerda de cada estrela marca meia, a direita marca a inteira.
 * Por baixo são botões de rádio (as setas do teclado andam de meia em meia e o leitor de tela lê a nota);
 * o valor vai no formulário pelo campo `name`. `optional` mostra "Limpar" para tirar a nota.
 */
export function StarInput({
  name,
  label: title,
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
      <legend className="text-xs font-semibold text-asfalto-700">{title}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            // Quanto desta estrela fica laranja: 0, metade ou inteira
            const fill = shown >= n ? 100 : shown >= n - 0.5 ? 50 : 0;
            return (
              <span key={n} className="relative p-0.5">
                <span className="relative block">
                  <svg viewBox="0 0 24 24" className={`${size} fill-asfalto-300`} aria-hidden>
                    <path d={STAR} />
                  </svg>
                  <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }} aria-hidden>
                    <svg viewBox="0 0 24 24" className={`${size} fill-largada-500`}>
                      <path d={STAR} />
                    </svg>
                  </span>
                </span>
                {[n - 0.5, n].map((v) => (
                  <label
                    key={v}
                    onMouseEnter={() => setHover(v)}
                    className={`absolute inset-y-0 w-1/2 cursor-pointer rounded has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-largada-500 ${
                      v === n ? "right-0" : "left-0"
                    }`}
                  >
                    <input type="radio" name={name} value={v} checked={value === v} onChange={() => setValue(v)} className="sr-only" />
                    <span className="sr-only">
                      {v.toLocaleString("pt-BR")} {v <= 1 ? "estrela" : "estrelas"}
                    </span>
                  </label>
                ))}
              </span>
            );
          })}
        </div>
        {/* Nos critérios (opcionais, menores) vai só o número, para caber ao lado do "Limpar" */}
        <span className="text-sm whitespace-nowrap text-asfalto-500 tabular-nums">{label(shown, !optional)}</span>
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
