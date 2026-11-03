import { z } from "zod";
import { parseDateBrt } from "@/lib/dates";
import type { RaffleStatus } from "@/generated/prisma/enums";
import { isPremium, PIX_STATUS } from "@/domain/assinatura/status";

export const raffleStatusLabels: Record<RaffleStatus, string> = {
  RASCUNHO: "Rascunho",
  ABERTO: "Aberto",
  ENCERRADO: "Encerrado",
  SORTEADO: "Sorteado",
};

const optionalUrl = z
  .string()
  .trim()
  .url("Informe um link válido")
  .refine((v) => /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** Formulário de sorteio do admin. O ganhador nunca vem do formulário: só da action de sortear. */
export const raffleSchema = z
  .object({
    title: z.string().trim().min(3, "Título muito curto").max(120),
    prize: z.string().trim().min(3, "Descreva o prêmio").max(160),
    description: z.string().trim().min(10, "Descrição muito curta").max(5000),
    imageUrl: optionalUrl,
    raceId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
    /** "on" = sem data: as participações ficam abertas até o admin encerrar */
    manualClose: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
    closeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().or(z.literal("").transform(() => undefined)),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido").optional().or(z.literal("").transform(() => undefined)),
    premiumOnly: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
    status: z.enum(["RASCUNHO", "ABERTO", "ENCERRADO"]),
    /** Meta opcional: sortear quando o Largadia tiver esse número de assinantes Premium ativos */
    drawAtSubscribers: z
      .union([z.literal("").transform(() => null), z.coerce.number().int("Use um número inteiro").min(1).max(1_000_000)])
      .optional()
      .transform((v) => v ?? null),
  })
  .refine((d) => d.manualClose || d.closeDate, { path: ["closeDate"], message: "Informe a data ou marque “eu encerro manualmente”" })
  .transform(({ closeDate, closeTime, manualClose, ...d }) => {
    if (manualClose || !closeDate) return { ...d, entriesCloseAt: null };
    const [h, m] = (closeTime ?? "23:59").split(":").map(Number);
    return { ...d, entriesCloseAt: new Date(parseDateBrt(closeDate)!.getTime() + (h * 60 + m) * 60_000) };
  });

export type RaffleInput = z.output<typeof raffleSchema>;

type RaffleRules = { status: RaffleStatus; entriesCloseAt: Date | null; premiumOnly: boolean };

/** O prazo já passou? Sem prazo, nunca passa: só o admin encerra. */
export function deadlinePassed(entriesCloseAt: Date | null, now = new Date()): boolean {
  return entriesCloseAt !== null && entriesCloseAt.getTime() <= now.getTime();
}

/** Pode participar agora? Devolve o motivo quando não pode, para mostrar ao corredor. */
export function entryBlockReason(raffle: RaffleRules, user: { premium: boolean } | null, now = new Date()): string | null {
  if (raffle.status !== "ABERTO") return "Este sorteio não está aceitando participações.";
  if (deadlinePassed(raffle.entriesCloseAt, now)) return "As participações já foram encerradas.";
  if (!user) return "Entre na sua conta para participar.";
  if (raffle.premiumOnly && !user.premium) return "Sorteio exclusivo para assinantes Premium.";
  return null;
}

/** Só sorteia depois do fim das participações e com pelo menos um participante. */
export function drawBlockReason(raffle: RaffleRules & { winnerId: string | null }, entries: number, now = new Date()): string | null {
  if (raffle.winnerId || raffle.status === "SORTEADO") return "Este sorteio já tem ganhador.";
  if (raffle.status === "RASCUNHO") return "Abra o sorteio antes de sortear.";
  if (raffle.status !== "ENCERRADO" && !deadlinePassed(raffle.entriesCloseAt, now)) {
    return raffle.entriesCloseAt
      ? "As participações ainda estão abertas. Encerre o sorteio ou espere o prazo."
      : "As participações ainda estão abertas. Clique em “Encerrar participações” antes de sortear.";
  }
  if (!entries) return "Ninguém participou deste sorteio.";
  return null;
}

/** Escolhe uma participação com chance igual para todas. `randomInt(n)` deve devolver um inteiro em [0, n). */
export function pickWinner<T>(entries: T[], randomInt: (n: number) => number): T {
  if (!entries.length) throw new Error("Sem participantes.");
  return entries[randomInt(entries.length)];
}

export type ParticipantStatus = "ASSINANTE" | "RENOVAR" | "EXPIRADO";

export const participantStatusLabels: Record<ParticipantStatus, string> = {
  ASSINANTE: "Assinante",
  RENOVAR: "Renovar",
  EXPIRADO: "Expirado",
};

/** Sem data de encerramento, "Renovar" avisa quem vence nos próximos dias. */
const RENEW_WARNING_DAYS = 7;

/**
 * Situação do participante para o sorteio:
 * - EXPIRADO: está sem Premium agora (não pode ganhar);
 * - RENOVAR: tem Premium, mas o Pix vence antes do fim das participações (ou em poucos dias, se não há data)
 *   ou o cartão está com pagamento atrasado;
 * - ASSINANTE: Premium ativo até lá.
 */
export function participantStatus(
  user: { subscriptionStatus: string | null; subscriptionEndsAt: Date | null },
  raffle: { entriesCloseAt: Date | null },
  now = new Date(),
): ParticipantStatus {
  if (!isPremium(user, now)) return "EXPIRADO";
  if (user.subscriptionStatus === "past_due") return "RENOVAR";
  if (user.subscriptionStatus === PIX_STATUS) {
    const limit = raffle.entriesCloseAt && raffle.entriesCloseAt > now ? raffle.entriesCloseAt : new Date(now.getTime() + RENEW_WARNING_DAYS * 86_400_000);
    if (!user.subscriptionEndsAt || user.subscriptionEndsAt < limit) return "RENOVAR";
  }
  return "ASSINANTE";
}
