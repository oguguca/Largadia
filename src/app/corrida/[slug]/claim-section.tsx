import Link from "next/link";
import { connection } from "next/server";
import { currentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDistance } from "@/lib/format";
import { pontos } from "@/config/pontos";
import { isPremium } from "@/domain/assinatura/status";
import { claimBlockReason, claimStatusLabels, pointsFor } from "@/domain/pontos/pontos";
import { ClaimForm } from "./claim-form";

/** "Eu corri esta prova": aparece depois da largada. Depende de quem vê, então roda na requisição. */
export async function ClaimSection({ race }: { race: { id: string; slug: string; startsAt: Date; distancesKm: number[] } }) {
  // A página só renderiza esta seção para provas passadas; o prazo é conferido em claimBlockReason
  await connection();
  const session = await currentSession();
  const userId = session?.user?.id;
  const [user, claim] = userId
    ? await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { subscriptionStatus: true, subscriptionEndsAt: true } }),
        db.pointClaim.findUnique({ where: { userId_raceId: { userId, raceId: race.id } } }),
      ])
    : [null, null];

  const best = pointsFor(Math.max(...race.distancesKm, 0));
  const box = "scroll-mt-20 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-largada-500";
  const title = (
    <div>
      <h2 className="font-display text-xl font-bold uppercase">Correu esta prova?</h2>
      <p className="text-sm text-asfalto-500">
        Envie a comprovação e ganhe {race.distancesKm.length ? `até ${best} pontos` : "pontos"} ({pontos.porProva} por prova + {pontos.porKm} por km).
      </p>
    </div>
  );

  if (claim && claim.status !== "RECUSADA") {
    return (
      <section id="pontuar" className={box}>
        {title}
        <p className="text-sm">
          <span className="font-semibold">{claimStatusLabels[claim.status]}</span> · {formatDistance(claim.distanceKm)} · {claim.points} pontos
          {claim.status === "APROVADA" && " já estão na sua conta 🎉"}
        </p>
      </section>
    );
  }

  const blocked = claimBlockReason(race, user ? { premium: isPremium(user) } : null, null);
  return (
    <section id="pontuar" className={box}>
      {title}
      {claim?.status === "RECUSADA" && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          Sua comprovação foi recusada{claim.reviewNote ? `: ${claim.reviewNote}` : "."} Você pode enviar de novo.
        </p>
      )}
      {blocked ? (
        <div className="space-y-2 text-sm">
          <p className="text-asfalto-700">{blocked}</p>
          {!user ? (
            <Link href={`/entrar?voltar=/corrida/${race.slug}`} className="font-semibold text-largada-600 hover:underline">
              Entrar
            </Link>
          ) : !isPremium(user) ? (
            <Link href="/assinatura" className="font-semibold text-largada-600 hover:underline">
              Conhecer o Premium
            </Link>
          ) : null}
        </div>
      ) : (
        <ClaimForm
          raceId={race.id}
          distances={race.distancesKm.map((km) => ({ km, label: formatDistance(km) }))}
          pointsByDistance={Object.fromEntries(race.distancesKm.map((km) => [String(km), pointsFor(km)]))}
        />
      )}
    </section>
  );
}
