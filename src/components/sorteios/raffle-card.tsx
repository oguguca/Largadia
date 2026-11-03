import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import { EntryButton } from "@/app/sorteios/entry-button";
import { LiveEntryCount } from "./live-entry-count";

export type RaffleCardData = {
  id: string;
  title: string;
  prize: string;
  imageUrl: string | null;
  entriesCloseAt: Date | null;
  premiumOnly: boolean;
  race: { name: string; slug: string } | null;
  _count: { entries: number };
};

/**
 * Card de sorteio aberto. O botão depende de quem vê: participar (pode), assinar (não é Premium)
 * ou entrar (visitante). As regras de verdade são reconferidas na action.
 */
export function RaffleCard({
  raffle,
  viewer,
  entered,
  children,
}: {
  raffle: RaffleCardData;
  viewer: "visitante" | "usuario" | "premium";
  entered: boolean;
  children?: React.ReactNode;
}) {
  const canEnter = viewer === "premium" || (viewer === "usuario" && !raffle.premiumOnly);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-asfalto-100">
      {raffle.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem cadastrada no admin, de domínio arbitrário
        <img src={raffle.imageUrl} alt={raffle.prize} loading="lazy" className="h-44 w-full object-cover" />
      ) : (
        <div className="faixa-largada h-3" aria-hidden />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-largada-600 uppercase">
            {raffle.premiumOnly ? "Exclusivo Premium" : "Aberto a todos"} ·{" "}
            {raffle.entriesCloseAt ? `até ${formatDateShort(raffle.entriesCloseAt)}` : "participações abertas"}
          </p>
          <h3 className="font-display text-2xl leading-tight font-bold uppercase">{raffle.prize}</h3>
          <p className="text-sm text-asfalto-500">{raffle.title}</p>
          <LiveEntryCount key={raffle._count.entries} raffleId={raffle.id} initial={raffle._count.entries} />
          {raffle.race && (
            <Link href={`/corrida/${raffle.race.slug}`} className="text-sm text-largada-600 hover:underline">
              {raffle.race.name}
            </Link>
          )}
        </div>
        {children}
        <div className="mt-auto">
          {canEnter ? (
            <EntryButton raffleId={raffle.id} entered={entered} />
          ) : viewer === "visitante" ? (
            <Link href="/entrar?voltar=/assinatura" className="inline-block rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950">
              Entre para participar
            </Link>
          ) : (
            <Link href="/assinatura" className="inline-block rounded-xl bg-asfalto-950 px-5 py-2.5 font-semibold text-white hover:bg-asfalto-800">
              Assine para participar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
