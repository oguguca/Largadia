import { temporada } from "@/config/pontos";

/**
 * Imagem do prêmio da temporada. Usa a foto configurada em `temporada.premioImagem`;
 * sem foto, mostra uma ilustração de tênis de corrida nas cores do Largadia.
 */
export function PrizeShoe({ className = "" }: { className?: string }) {
  const label = temporada.premio ? `Prêmio da temporada: ${temporada.premio}` : "Tênis de corrida";
  if (temporada.premioImagem) {
    return (
      <div className={`relative grid place-items-center ${className}`}>
        {/* Brilho no chão, embaixo do tênis */}
        <span aria-hidden className="absolute bottom-2 h-6 w-3/4 rounded-full bg-largada-500/40 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- foto do prêmio pode vir de qualquer domínio */}
        <img
          src={temporada.premioImagem}
          alt={label}
          className="relative max-h-full w-full object-contain"
          // Inclinação e sombra dão o efeito de produto flutuando
          style={{ transform: "rotate(-12deg) translateY(-6px)", filter: "drop-shadow(0 28px 22px rgba(0,0,0,0.55))" }}
        />
      </div>
    );
  }
  return (
    <svg viewBox="8 22 232 102" className={className} role="img" aria-label={label}>
      {/* Sombra no chão */}
      <ellipse cx="124" cy="121" rx="106" ry="4.5" className="fill-black/15" />
      {/* Cabedal */}
      <path
        d="M16 82 L20 50 C21 42 27 38 35 38 L45 38 C51 47 62 52 75 52 C86 52 92 45 96 35 L106 33 C122 52 152 68 190 76 C210 80 224 84 230 92 Z"
        className="fill-largada-500"
      />
      {/* Contraforte do calcanhar e biqueira */}
      <path d="M16 82 L20 50 C21 42 27 38 35 38 L41 38 L48 84 Z" className="fill-largada-700" />
      <path d="M188 76 C209 80 224 84 230 92 L196 90 C200 84 197 79 188 76 Z" className="fill-largada-600" />
      {/* Faixa lateral */}
      <path d="M60 85 C98 83 138 73 172 59 L180 68 C144 82 104 91 64 91 Z" className="fill-asfalto-950" />
      {/* Puxador do calcanhar */}
      <path d="M28 39 L37 39 L35 28 C34 24 29 24 28 28 Z" className="fill-asfalto-950" />
      {/* Cadarço */}
      <path d="M103 42 L112 35 M114 49 L123 42 M125 56 L134 49 M136 62 L145 55" className="stroke-white" strokeWidth="3.5" strokeLinecap="round" />
      {/* Entressola alta no calcanhar e ponta levantada, como num tênis de corrida */}
      <path d="M13 80 C80 84 160 88 229 89 C234 93 232 100 224 103 L40 112 C22 112 12 104 12 94 Z" className="fill-white" />
      {/* Solado */}
      <path
        d="M40 112 L224 103 C230 101 234 98 236 95 C236 103 228 110 216 111 L42 118 C26 118 16 112 13 104 C18 110 28 112 40 112 Z"
        className="fill-pace-500"
      />
    </svg>
  );
}
