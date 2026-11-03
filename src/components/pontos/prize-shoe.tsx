import { temporada } from "@/config/pontos";

/**
 * Imagem do prêmio da temporada. Usa a foto configurada em `temporada.premioImagem`;
 * sem foto, mostra uma ilustração de tênis de corrida nas cores do Largadia.
 */
export function PrizeShoe({ className = "" }: { className?: string }) {
  if (temporada.premioImagem) {
    return (
      <div className={`relative grid place-items-center ${className}`}>
        {/* Brilho no chão, embaixo do tênis */}
        <span aria-hidden className="absolute bottom-2 h-6 w-3/4 rounded-full bg-largada-500/40 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- foto do prêmio pode vir de qualquer domínio */}
        <img
          src={temporada.premioImagem}
          alt={`Prêmio da temporada: ${temporada.premio}`}
          className="relative max-h-full w-full object-contain"
          // Inclinação e sombra dão o efeito de produto flutuando
          style={{ transform: "rotate(-12deg) translateY(-6px)", filter: "drop-shadow(0 28px 22px rgba(0,0,0,0.55))" }}
        />
      </div>
    );
  }
  return (
    <svg viewBox="0 0 240 130" className={className} role="img" aria-label={`Prêmio da temporada: ${temporada.premio}`}>
      {/* Sombra no chão */}
      <ellipse cx="122" cy="122" rx="104" ry="6" className="fill-black/25" />
      {/* Solado */}
      <path d="M12 98 H228 C236 98 238 106 232 111 C224 118 210 120 196 120 H44 C24 120 10 112 12 98 Z" className="fill-pace-500" />
      {/* Entressola com faixa clara */}
      <path d="M14 92 H226 C232 92 232 100 226 100 H18 C12 100 12 92 14 92 Z" className="fill-white" />
      {/* Cabedal */}
      <path
        d="M18 92 C16 72 30 62 54 58 L98 38 C108 33 118 35 125 44 L150 74 C172 79 204 79 222 85 C231 88 232 92 226 92 Z"
        className="fill-largada-500"
      />
      {/* Calcanhar reforçado */}
      <path d="M18 92 C16 72 30 62 54 58 L58 92 Z" className="fill-largada-700" />
      {/* Faixas laterais */}
      <path d="M70 88 L112 56 M88 90 L130 60 M106 91 L144 70" className="stroke-white/85" strokeWidth="5" strokeLinecap="round" />
      {/* Cadarço */}
      <path d="M102 44 L114 58 M110 40 L124 54 M118 40 L132 62" className="stroke-asfalto-950" strokeWidth="3" strokeLinecap="round" />
      {/* Bico */}
      <path d="M190 80 C206 81 218 83 224 86" className="stroke-largada-700" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
