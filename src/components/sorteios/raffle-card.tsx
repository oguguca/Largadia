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
  /** Meta de assinantes Premium para sortear (vazio = sem meta) */
  drawAtSubscribers: number | null;
  activeSubscribers: number;
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
      {/* Imagem inteira (sem corte) num quadro de altura fixa */}
      <div>
        {raffle.imageUrl ? (
          <div className="grid aspect-[4/3] place-items-center bg-gradient-to-b from-asfalto-50 to-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem cadastrada no admin, de domínio arbitrário */}
            <img src={raffle.imageUrl} alt={raffle.prize} loading="lazy" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="faixa-largada aspect-[4/3] opacity-90" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 border-t border-asfalto-100 p-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-2.5 py-1 ${raffle.premiumOnly ? "bg-asfalto-950 text-white" : "bg-pace-500 text-asfalto-950"}`}>
              {raffle.premiumOnly ? "Exclusivo Premium" : "Aberto a todos"}
            </span>
            <span className="rounded-full bg-asfalto-100 px-2.5 py-1 text-asfalto-700">
              {raffle.entriesCloseAt ? `Até ${formatDateShort(raffle.entriesCloseAt)}` : "Participações abertas"}
            </span>
          </div>
          <h3 className="font-display text-2xl leading-tight font-bold uppercase">{raffle.prize}</h3>
          {raffle.title.trim().toLowerCase() !== raffle.prize.trim().toLowerCase() && (
            <p className="text-sm text-asfalto-500">{raffle.title}</p>
          )}
          <LiveEntryCount key={raffle._count.entries} raffleId={raffle.id} initial={raffle._count.entries} />
          {raffle.drawAtSubscribers && <SubscriberGoal goal={raffle.drawAtSubscribers} current={raffle.activeSubscribers} />}
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

/** "Sorteado quando o Largadia bater 100 assinantes Premium", com a barra de quanto falta. */
function SubscriberGoal({ goal, current }: { goal: number; current: number }) {
  const reached = current >= goal;
  const pct = Math.min(100, Math.round((current / goal) * 100));
  return (
    <div className="mt-3 rounded-xl bg-asfalto-950 p-3 text-white">
      <p className="text-sm font-semibold">
        {reached ? "🎯 Meta batida! O sorteio acontece em breve." : `🎯 Sorteado quando o Largadia bater ${goal.toLocaleString("pt-BR")} assinantes Premium`}
      </p>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(current, goal)}
        aria-label="Assinantes Premium até a meta"
      >
        <div className="h-full rounded-full bg-pace-500" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-asfalto-300 tabular-nums">
        {Math.min(current, goal).toLocaleString("pt-BR")} de {goal.toLocaleString("pt-BR")} assinantes
        {!reached && ` · faltam ${(goal - current).toLocaleString("pt-BR")}`}
      </p>
    </div>
  );
}
