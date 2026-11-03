import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateLong, formatDistance } from "@/lib/format";
import { RunCover } from "@/components/biblioteca/run-cover";
import { brtDay, hasStarted } from "@/domain/biblioteca/biblioteca";
import { photoUrl } from "@/domain/biblioteca/salvar";
import { isPremium } from "@/domain/assinatura/status";
import { claimBlockReason, claimStatusLabels, formatFinishTime, publicName } from "@/domain/pontos/pontos";
import { EditRunForm, RemoveRunButton } from "./edit-run-form";
import { PhotoForm } from "./photo-form";

export const metadata: Metadata = { title: "Avaliar corrida", robots: { index: false } };

export default function AvaliarCorridaPage(props: PageProps<"/minhas-corridas/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse px-4 py-10" />}>
      <RunDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function RunDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/minhas-corridas/[id]">["params"];
  searchParams: PageProps<"/minhas-corridas/[id]">["searchParams"];
}) {
  const { id } = await params;
  const user = await requireUser(`/minhas-corridas/${id}`);
  if (!z.string().cuid().safeParse(id).success) notFound();
  const log = await db.runLog.findFirst({
    where: { id, userId: user.id },
    include: { race: { select: { id: true, slug: true, name: true, city: true, state: true, imageUrl: true, type: true, startsAt: true, distancesKm: true } } },
  });
  if (!log) notFound();
  const { nova } = await searchParams;
  const race = log.race;
  const claim = race
    ? await db.pointClaim.findUnique({ where: { userId_raceId: { userId: user.id, raceId: race.id } }, select: { status: true, points: true } })
    : null;
  // Assinante que ainda não pontuou esta prova e está no prazo: oferece pontuar
  const canClaim = !!race && (!claim || claim.status === "RECUSADA") && !claimBlockReason(race, { premium: isPremium(user) }, null);

  const name = race?.name ?? log.customRaceName ?? "Corrida";
  const city = race ? `${race.city}/${race.state}` : log.customCity && log.customState ? `${log.customCity}/${log.customState}` : null;
  const place = log.virtual ? "Corrida virtual" : city;
  const upcoming = !hasStarted(log.raceDate);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/minhas-corridas" className="text-sm text-asfalto-500 hover:text-asfalto-900">
        ← Minhas corridas
      </Link>

      {nova === "1" && (
        <p className="mt-4 rounded-lg bg-pace-500/20 p-3 text-sm font-semibold">
          {upcoming ? "Prova adicionada às suas próximas largadas." : "Corrida adicionada à sua estante. Agora dê a sua nota."}
        </p>
      )}

      <div className="mt-4 grid gap-8 md:grid-cols-[18rem_1fr]">
        <aside className="space-y-3">
          <div className="aspect-[4/5] overflow-hidden rounded-md bg-asfalto-950 shadow-[6px_8px_0_0_rgb(0_0_0/0.12)] ring-1 ring-asfalto-950/10">
            <RunCover
              photoUrl={log.photoId ? photoUrl(log.photoId) : null}
              imageUrl={race?.imageUrl ?? null}
              type={race?.type ?? "RUA"}
              name={name}
              year={Number(brtDay(log.raceDate).slice(0, 4))}
              place={place}
              eager
            />
          </div>
          <PhotoForm id={log.id} hasPhoto={!!log.photoId} hasPoster={!!race?.imageUrl} />
          {race && (
            <Link href={`/corrida/${race.slug}`} className="block text-sm font-semibold text-largada-600 hover:underline">
              Ver a página da prova
            </Link>
          )}
          {claim && claim.status !== "RECUSADA" && (
            <p className="text-sm text-asfalto-700">
              Pontos: <strong>{claimStatusLabels[claim.status]}</strong> · {claim.points} pts
            </p>
          )}
          {canClaim && race && (
            <Link href={`/corrida/${race.slug}#pontuar`} className="block rounded-xl bg-asfalto-950 p-3 text-sm text-asfalto-300 hover:bg-asfalto-900">
              <span className="font-display text-lg font-bold text-white uppercase">Pontuar esta corrida</span>
              <span className="block">Envie a comprovação e some pontos no ranking da temporada.</span>
            </Link>
          )}
        </aside>

        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold italic uppercase md:text-5xl">{name}</h1>
          <p className="mt-2 text-asfalto-500">
            {formatDateLong(log.raceDate)}
            {place && ` · ${place}`}
          </p>

          <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-asfalto-100 md:p-8">
            <EditRunForm
              id={log.id}
              distances={(race?.distancesKm ?? []).map((km) => ({ km, label: formatDistance(km) }))}
              publicReview={!!race}
              authorName={publicName(user.name)}
              opensOn={upcoming ? formatDateLong(log.raceDate) : undefined}
              initial={{
                virtual: log.virtual,
                distanceKm: log.distanceKm === null ? "" : String(log.distanceKm),
                finishTime: log.finishSeconds === null ? "" : formatFinishTime(log.finishSeconds),
                comment: log.comment ?? "",
                rating: log.rating,
                ratingCourse: log.ratingCourse,
                ratingOrganization: log.ratingOrganization,
                ratingKit: log.ratingKit,
                ratingHydration: log.ratingHydration,
              }}
            />
          </div>
          {log.hiddenAt && (
            <p className="mt-3 text-sm text-asfalto-500">Esta avaliação foi retirada da página da prova pela moderação. Ela continua na sua estante.</p>
          )}
          <div className="mt-6">
            <RemoveRunButton id={log.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
