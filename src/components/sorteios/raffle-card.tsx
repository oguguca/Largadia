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
 * `rules` é o texto do admin; fica recolhido em "Como funciona" para os cards terem a mesma altura.
 */
export function RaffleCard({
  raffle,
  viewer,
  entered,
  rules,
}: {
  raffle: RaffleCardData;
  viewer: "visitante" | "usuario" | "premium";
  entered: boolean;
  rules?: string;
}) {
  // Todo sorteio é só para Premium: o ganhador precisa estar com a assinatura ativa
  const canEnter = viewer === "premium";
  const subtitle = raffle.title.trim().toLowerCase() !== raffle.prize.trim().toLowerCase() ? raffle.title : null;
  return (
    // Cor do texto fixa: no início o card fica sobre a faixa escura do Premium
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white text-asfalto-950 ring-1 ring-asfalto-100">
      {/* As artes dos prêmios são quadradas e já têm fundo: ocupam o topo inteiro */}
      <div className="relative aspect-square bg-asfalto-950">
        {raffle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem cadastrada no admin, de domínio arbitrário
          <img src={raffle.imageUrl} alt={raffle.prize} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="faixa-largada h-full w-full opacity-90" aria-hidden />
        )}
        {raffle.entriesCloseAt && (
          <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-asfalto-950 shadow">
            Participações até {formatDateShort(raffle.entriesCloseAt)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-display text-2xl leading-tight font-bold uppercase">{raffle.prize}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-asfalto-500">{subtitle}</p>}
          {raffle.race && (
            <Link href={`/corrida/${raffle.race.slug}`} className="mt-1 inline-block text-sm font-semibold text-largada-600 hover:underline">
              {raffle.race.name}
            </Link>
          )}
        </div>

        {raffle.drawAtSubscribers && <SubscriberGoal goal={raffle.drawAtSubscribers} current={raffle.activeSubscribers} />}

        {rules?.trim() && (
          <details className="group text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-asfalto-700 hover:text-asfalto-950">
              Como funciona
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-asfalto-700">{rules}</p>
          </details>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-asfalto-100 pt-4">
          <LiveEntryCount key={raffle._count.entries} raffleId={raffle.id} initial={raffle._count.entries} />
          {canEnter ? (
            <EntryButton raffleId={raffle.id} entered={entered} />
          ) : viewer === "visitante" ? (
            <Link href="/entrar?voltar=/assinatura" className="rounded-xl bg-largada-500 px-5 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600">
              Entre para participar
            </Link>
          ) : (
            <Link href="/assinatura" className="rounded-xl bg-asfalto-950 px-5 py-2.5 font-semibold text-white hover:bg-asfalto-800">
              Assine para participar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Meta de assinantes para o sorteio acontecer, com a barra de quanto falta. */
function SubscriberGoal({ goal, current }: { goal: number; current: number }) {
  const reached = current >= goal;
  const pct = Math.min(100, Math.round((current / goal) * 100));
  return (
    <div className="rounded-xl bg-asfalto-50 p-3 ring-1 ring-asfalto-100">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{reached ? "Meta batida: sorteio em breve" : `Sorteio ao chegar a ${goal.toLocaleString("pt-BR")} assinantes`}</span>
        <span className="font-display text-lg leading-none font-extrabold tabular-nums">
          {Math.min(current, goal).toLocaleString("pt-BR")}
          <span className="text-asfalto-500">/{goal.toLocaleString("pt-BR")}</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-asfalto-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(current, goal)}
        aria-label="Assinantes Premium até a meta"
      >
        <div className="h-full rounded-full bg-largada-500" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      {!reached && (
        <p className="mt-1.5 text-xs text-asfalto-500 tabular-nums">
          {goal - current === 1 ? "Falta 1 assinante" : `Faltam ${(goal - current).toLocaleString("pt-BR")} assinantes`}
        </p>
      )}
    </div>
  );
}
