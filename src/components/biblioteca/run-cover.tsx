import type { RaceType } from "@/generated/prisma/enums";

const tones: Record<RaceType, string> = {
  RUA: "bg-largada-600",
  TRAIL: "bg-emerald-700",
  NOTURNA: "bg-indigo-800",
  TEMATICA: "bg-fuchsia-700",
  SOLIDARIA: "bg-rose-700",
  KIDS: "bg-sky-600",
};

/**
 * Capa de uma corrida na estante, como a de um livro. Ordem: a foto que a pessoa enviou,
 * o cartaz da prova inteiro (com o próprio cartaz desfocado preenchendo as sobras) ou,
 * sem imagem nenhuma, uma capa tipográfica com o nome, o ano e a cidade.
 */
export function RunCover({
  photoUrl,
  imageUrl,
  type,
  name,
  year,
  place,
  eager = false,
}: {
  photoUrl: string | null;
  imageUrl: string | null;
  type: RaceType;
  name: string;
  year: number;
  place: string | null;
  eager?: boolean;
}) {
  const loading = eager ? "eager" : "lazy";
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- foto enviada, servida pelo próprio site
    return <img src={photoUrl} alt={`Foto de ${name}`} loading={loading} className="h-full w-full object-cover" />;
  }
  if (imageUrl) {
    return (
      <div className="relative h-full w-full bg-asfalto-950">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens de organizadores vêm de domínios arbitrários */}
        <img src={imageUrl} alt="" aria-hidden loading={loading} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens de organizadores vêm de domínios arbitrários */}
        <img src={imageUrl} alt={`Cartaz de ${name}`} loading={loading} className="relative h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-white ${tones[type]}`}>
      {/* Lombada e faixa de largada, para lembrar uma capa de livro de corrida */}
      <div className="absolute inset-y-0 left-0 w-2 bg-black/20" aria-hidden />
      <span className="font-display text-sm font-bold tracking-wide text-white/80 tabular-nums">{year}</span>
      <p className="font-display text-2xl leading-[0.95] font-extrabold break-words uppercase italic [overflow-wrap:anywhere] sm:text-3xl">
        {name}
      </p>
      <div>
        <div className="faixa-largada mb-2 h-1.5 opacity-90" aria-hidden />
        {place && <span className="text-xs font-medium text-white/85">{place}</span>}
      </div>
    </div>
  );
}
