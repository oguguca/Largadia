import type { RaceType } from "@/generated/prisma/enums";
import { raceTypeLabels } from "@/config/corridas";

const gradients: Record<RaceType, string> = {
  RUA: "from-largada-500 to-largada-700",
  TRAIL: "from-emerald-500 to-emerald-800",
  NOTURNA: "from-indigo-600 to-asfalto-950",
  TEMATICA: "from-fuchsia-500 to-purple-800",
  SOLIDARIA: "from-rose-500 to-rose-700",
  KIDS: "from-sky-400 to-sky-700",
};

/** Imagem da corrida ou, na falta dela, uma capa gerada a partir do tipo. */
export function RaceVisual({
  imageUrl,
  type,
  name,
  className = "",
}: {
  imageUrl: string | null;
  type: RaceType;
  name: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagens de organizadores vêm de domínios arbitrários
      <img src={imageUrl} alt={name} loading="lazy" className={`object-cover ${className}`} />
    );
  }
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden bg-gradient-to-br ${gradients[type]} ${className}`}
    >
      <div className="absolute inset-y-0 -right-6 w-24 -skew-x-12 bg-white/10" />
      <div className="absolute inset-y-0 right-14 w-6 -skew-x-12 bg-white/10" />
      <span className="absolute bottom-2 left-3 font-display text-3xl font-extrabold italic tracking-tight text-white/90 uppercase">
        {raceTypeLabels[type]}
      </span>
    </div>
  );
}
