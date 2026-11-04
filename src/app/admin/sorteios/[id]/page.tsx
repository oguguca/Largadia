import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  drawBlockReason,
  participantStatus,
  participantStatusLabels,
  raffleStatusLabels,
  type ParticipantStatus,
} from "@/domain/sorteios/sorteio";
import { PIX_STATUS, statusLabels } from "@/domain/assinatura/status";
import { countActiveSubscribers } from "@/domain/sorteios/queries";
import { addRaffleEntry, deleteRaffle, drawRaffle, removeRaffleEntry, saveRaffle, setRaffleStatus } from "../actions";
import { RaffleForm } from "../raffle-form";
import { raceOptions } from "../races";

const toBrt = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString();
const dateTime = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const dateOnly = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const statusStyle: Record<ParticipantStatus, string> = {
  ASSINANTE: "bg-emerald-100 text-emerald-800",
  RENOVAR: "bg-amber-100 text-amber-800",
  EXPIRADO: "bg-red-100 text-red-700",
};

/** "Pix até 30/11" ou "Cartão (ativa), renova em 15/11": o que define a situação do participante. */
function planLine(user: { subscriptionStatus: string | null; subscriptionEndsAt: Date | null }): string {
  if (!user.subscriptionStatus) return "Nunca assinou";
  const ends = user.subscriptionEndsAt ? dateOnly(user.subscriptionEndsAt) : null;
  if (user.subscriptionStatus === PIX_STATUS) return ends ? `Pix pré-pago até ${ends}` : "Pix pré-pago";
  const label = statusLabels[user.subscriptionStatus as keyof typeof statusLabels] ?? user.subscriptionStatus;
  return ends ? `Cartão (${label}), período até ${ends}` : `Cartão (${label})`;
}

export default async function SorteioPage(props: PageProps<"/admin/sorteios/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const raffle = await db.raffle.findUnique({
    where: { id },
    include: {
      winner: { select: { name: true, email: true } },
      entries: {
        orderBy: { createdAt: "desc" },
        take: 500,
        include: { user: { select: { name: true, email: true, subscriptionStatus: true, subscriptionEndsAt: true } } },
      },
      _count: { select: { entries: true } },
    },
  });
  if (!raffle) notFound();
  const drawBlocked = drawBlockReason(raffle, raffle._count.entries);
  const subscribers = raffle.drawAtSubscribers ? await countActiveSubscribers() : 0;
  const now = new Date();
  const participants = raffle.entries.map((e) => ({ ...e, status: participantStatus(e.user, raffle, now) }));
  const counts: Record<ParticipantStatus, number> = { ASSINANTE: 0, RENOVAR: 0, EXPIRADO: 0 };
  for (const p of participants) counts[p.status]++;
  // Pode ganhar quem tem Premium ativo agora (Assinante ou Renovar)
  const eligible = counts.ASSINANTE + counts.RENOVAR;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold italic uppercase">{raffle.title}</h1>
        <p className="text-sm text-asfalto-500">
          {raffleStatusLabels[raffle.status]} · {raffle._count.entries} participante(s)
        </p>
      </div>
      {typeof sp.erro === "string" && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.erro}</p>}

      <section className="rounded-2xl bg-asfalto-950 p-5 text-white">
        <p className="text-sm font-semibold tracking-widest text-pace-500 uppercase">Ganhador</p>
        {raffle.winner ? (
          <>
            <p className="mt-1 font-display text-3xl font-extrabold italic uppercase">🏆 {raffle.winner.name}</p>
            <p className="text-sm text-asfalto-300">
              {raffle.winner.email} · sorteado em {raffle.drawnAt && dateTime(raffle.drawnAt)}
            </p>
            {sp.sorteado && <p className="mt-2 text-sm text-pace-500">Sorteio feito! Avise o ganhador pelo e-mail acima.</p>}
          </>
        ) : (
          <>
            <p className="mt-1 text-asfalto-300">
              {raffle.entriesCloseAt
                ? `Participações até ${dateTime(raffle.entriesCloseAt)}.`
                : "Sem data: as participações ficam abertas até você encerrar."}{" "}
              O sorteio escolhe ao acaso, com chance igual, só entre quem está com o Premium ativo na hora.
              {raffle.drawAtSubscribers && (
                <span className={`mt-2 block font-semibold ${subscribers >= raffle.drawAtSubscribers ? "text-pace-500" : "text-white"}`}>
                  🎯 Meta: {subscribers} de {raffle.drawAtSubscribers} assinantes Premium ativos
                  {subscribers >= raffle.drawAtSubscribers ? " · meta batida, já pode sortear" : ` · faltam ${raffle.drawAtSubscribers - subscribers}`}
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {raffle.status === "ABERTO" && (
                <form action={setRaffleStatus.bind(null, raffle.id, "ENCERRADO")}>
                  <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Encerrar participações</button>
                </form>
              )}
              {raffle.status === "ENCERRADO" && (
                <form action={setRaffleStatus.bind(null, raffle.id, "ABERTO")}>
                  <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Reabrir</button>
                </form>
              )}
              {drawBlocked ? (
                <span className="text-sm text-asfalto-300">{drawBlocked}</span>
              ) : (
                <details className="group">
                  <summary className="cursor-pointer list-none rounded-xl bg-pace-500 px-4 py-2 text-sm font-semibold text-asfalto-950 group-open:hidden">
                    Sortear ganhador
                  </summary>
                  <form action={drawRaffle.bind(null, raffle.id)} className="flex items-center gap-2 text-sm">
                    <span>
                      Sortear entre {eligible} participante(s) com Premium ativo
                      {counts.EXPIRADO > 0 && ` (${counts.EXPIRADO} expirado(s) ficam de fora)`}? Não dá para refazer.
                    </span>
                    <button className="rounded-xl bg-pace-500 px-4 py-2 font-semibold text-asfalto-950">Confirmar sorteio</button>
                  </form>
                </details>
              )}
            </div>
          </>
        )}
      </section>

      {raffle.status !== "SORTEADO" && (
        <RaffleForm
          action={saveRaffle.bind(null, raffle.id)}
          races={await raceOptions(raffle.raceId)}
          submitLabel="Salvar alterações"
          initial={{
            title: raffle.title,
            prize: raffle.prize,
            description: raffle.description,
            imageUrl: raffle.imageUrl ?? "",
            raceId: raffle.raceId ?? "",
            manualClose: raffle.entriesCloseAt ? "" : "on",
            closeDate: raffle.entriesCloseAt ? toBrt(raffle.entriesCloseAt).slice(0, 10) : "",
            closeTime: raffle.entriesCloseAt ? toBrt(raffle.entriesCloseAt).slice(11, 16) : "",
            premiumOnly: raffle.premiumOnly ? "on" : "",
            drawAtSubscribers: raffle.drawAtSubscribers ? String(raffle.drawAtSubscribers) : "",
            status: raffle.status,
          }}
        />
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-asfalto-100">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold uppercase">Participantes ({raffle._count.entries})</h2>
          <ul className="flex flex-wrap gap-2 text-xs font-semibold">
            {(Object.keys(participantStatusLabels) as ParticipantStatus[]).map((st) => (
              <li key={st} className={`rounded-full px-2 py-0.5 ${statusStyle[st]}`}>
                {participantStatusLabels[st]}: {counts[st]}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-1 text-xs text-asfalto-500">
          Só quem está como Assinante na hora do sorteio pode ganhar. Renovar: o Premium vence antes do fim das participações (ou em
          até 7 dias, se não há data) ou o cartão está com pagamento atrasado. Expirado: sem Premium agora.
        </p>

        {raffle.status !== "SORTEADO" && (
          <form action={addRaffleEntry.bind(null, raffle.id)} className="mt-4 flex flex-wrap gap-2">
            <label htmlFor="add-email" className="sr-only">
              E-mail da conta
            </label>
            <input
              id="add-email"
              name="email"
              type="email"
              required
              placeholder="E-mail da conta para adicionar"
              className="min-w-0 flex-1 rounded-lg border border-asfalto-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-asfalto-950 px-4 py-2 text-sm font-semibold text-white">Adicionar participante</button>
          </form>
        )}
        {sp.adicionado && <p className="mt-2 text-sm font-semibold text-emerald-700">Participante adicionado.</p>}

        {participants.length ? (
          <ul className="mt-4 divide-y divide-asfalto-100 text-sm">
            {participants.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${statusStyle[e.status]}`}>
                  {participantStatusLabels[e.status]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{e.user.name}</span> <span className="text-asfalto-500">· {e.user.email}</span>
                  <span className="block text-xs text-asfalto-500">{planLine(e.user)}</span>
                </span>
                <span className="text-xs text-asfalto-500 tabular-nums">entrou {dateTime(e.createdAt)}</span>
                {raffle.status !== "SORTEADO" && (
                  <form action={removeRaffleEntry.bind(null, raffle.id, e.id)}>
                    <button className="rounded-lg px-2 py-1 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-50">Remover</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-asfalto-500">Ninguém participou ainda.</p>
        )}
        {raffle._count.entries > raffle.entries.length && (
          <p className="mt-2 text-xs text-asfalto-500">
            Mostrando os {raffle.entries.length} mais recentes de {raffle._count.entries}.
          </p>
        )}
      </section>

      <details className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
        <summary className="cursor-pointer text-sm font-semibold text-red-800">Remover sorteio</summary>
        <form action={deleteRaffle.bind(null, raffle.id)} className="mt-2 flex items-center gap-2 text-sm text-red-700">
          <span>Remove o sorteio e todas as participações. Não dá para desfazer.</span>
          <button className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">Confirmar remoção</button>
        </form>
      </details>
    </div>
  );
}
