"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isPremium } from "@/domain/assinatura/status";
import { saveUploadedImage } from "@/domain/uploads/imagem";
import { sorteios } from "@/config/sorteios";
import { drawBlockReason, pickWinner, raffleSchema } from "@/domain/sorteios/sorteio";

export type RaffleFormState = { errors?: Record<string, string[]>; values?: Record<string, string> } | null;

const idSchema = z.string().cuid();

/** Cria (sem id) ou atualiza (com id) um sorteio. Status SORTEADO só vem da action de sortear. */
export async function saveRaffle(id: string | null, _prev: RaffleFormState, form: FormData): Promise<RaffleFormState> {
  await requireAdmin();
  // Só os campos de texto voltam para o formulário em caso de erro (o arquivo não dá para devolver)
  const values = Object.fromEntries([...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string"));
  const parsed = raffleSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (errors[String(issue.path[0] ?? "form")] ??= []).push(issue.message);
    return { errors, values };
  }
  // Arquivo escolhido no computador tem prioridade sobre o link
  const uploaded = await saveUploadedImage(form.get("imageFile"));
  if (uploaded && "error" in uploaded) return { errors: { imageFile: [uploaded.error] }, values };
  const imageUrl = uploaded?.url ?? parsed.data.imageUrl ?? null;
  const data = { ...parsed.data, imageUrl, raceId: parsed.data.raceId ?? null };

  if (id) {
    const current = await db.raffle.findUnique({ where: { id: idSchema.parse(id) }, select: { status: true } });
    if (!current) redirect("/admin/sorteios");
    if (current.status === "SORTEADO") return { errors: { form: ["Sorteio já realizado: não dá mais para editar."] }, values };
    await db.raffle.update({ where: { id }, data });
  } else {
    await db.raffle.create({ data });
  }
  revalidatePath("/assinatura");
  redirect("/admin/sorteios?salvo=1");
}

export async function setRaffleStatus(id: string, status: "ABERTO" | "ENCERRADO") {
  await requireAdmin();
  // A action pode ser chamada direto: SORTEADO só sai de drawRaffle, com ganhador
  const next = z.enum(["ABERTO", "ENCERRADO"]).parse(status);
  await db.raffle.updateMany({ where: { id: idSchema.parse(id), status: { not: "SORTEADO" } }, data: { status: next } });
  revalidatePath("/assinatura");
  revalidatePath(`/admin/sorteios/${id}`);
}

/** Sorteia o ganhador com crypto.randomInt. O update condicional impede dois sorteios simultâneos. */
export async function drawRaffle(id: string) {
  await requireAdmin();
  const raffle = await db.raffle.findUnique({
    where: { id: idSchema.parse(id) },
    include: {
      entries: {
        select: { userId: true, user: { select: { subscriptionStatus: true, subscriptionEndsAt: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!raffle) redirect("/admin/sorteios");
  // O prêmio só vai para quem está com o Premium ativo na hora do sorteio e fora da carência de ganhador
  const recentWinners = new Set(
    (
      await db.raffle.findMany({
        where: { drawnAt: { gt: new Date(Date.now() - sorteios.carenciaGanhadorDias * 86_400_000) }, winnerId: { not: null } },
        select: { winnerId: true },
      })
    ).map((r) => r.winnerId),
  );
  const eligible = raffle.entries.filter((e) => isPremium(e.user) && !recentWinners.has(e.userId));
  const blocked =
    drawBlockReason(raffle, raffle.entries.length) ??
    (eligible.length ? null : "Nenhum participante pode ganhar agora (Premium ativo e fora da carência de quem ganhou recentemente).");
  if (blocked) redirect(`/admin/sorteios/${id}?erro=${encodeURIComponent(blocked)}`);

  const winner = pickWinner(eligible, randomInt);
  const done = await db.raffle.updateMany({
    where: { id, winnerId: null },
    data: { winnerId: winner.userId, status: "SORTEADO", drawnAt: new Date() },
  });
  if (!done.count) redirect(`/admin/sorteios/${id}?erro=${encodeURIComponent("Este sorteio já tem ganhador.")}`);
  revalidatePath("/assinatura");
  redirect(`/admin/sorteios/${id}?sorteado=1`);
}

/** Inclui um participante pelo e-mail da conta (ex.: inscrição feita fora do site). */
export async function addRaffleEntry(id: string, form: FormData) {
  await requireAdmin();
  const raffleId = idSchema.parse(id);
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  const back = (msg: string) => redirect(`/admin/sorteios/${raffleId}?erro=${encodeURIComponent(msg)}`);
  if (!email.success) back("Informe um e-mail válido.");
  const [raffle, user] = await Promise.all([
    db.raffle.findUnique({ where: { id: raffleId }, select: { status: true } }),
    db.user.findUnique({ where: { email: email.data! }, select: { id: true } }),
  ]);
  if (!raffle) redirect("/admin/sorteios");
  if (raffle.status === "SORTEADO") back("Sorteio já realizado: não dá mais para mudar os participantes.");
  if (!user) back("Nenhuma conta com esse e-mail.");
  const created = await db.raffleEntry.createMany({ data: [{ raffleId, userId: user!.id }], skipDuplicates: true });
  if (!created.count) back("Essa pessoa já está participando.");
  revalidatePath(`/admin/sorteios/${raffleId}`);
  revalidatePath("/assinatura");
  redirect(`/admin/sorteios/${raffleId}?adicionado=1`);
}

/** Tira um participante do sorteio (antes de sortear). */
export async function removeRaffleEntry(raffleId: string, entryId: string) {
  await requireAdmin();
  await db.raffleEntry.deleteMany({
    where: { id: idSchema.parse(entryId), raffleId: idSchema.parse(raffleId), raffle: { status: { not: "SORTEADO" } } },
  });
  revalidatePath(`/admin/sorteios/${raffleId}`);
  revalidatePath("/assinatura");
}

export async function deleteRaffle(id: string) {
  await requireAdmin();
  await db.raffle.deleteMany({ where: { id: idSchema.parse(id) } });
  revalidatePath("/assinatura");
  redirect("/admin/sorteios?removido=1");
}
