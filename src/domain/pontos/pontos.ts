import { z } from "zod";
import { pontos } from "@/config/pontos";
import { UFS } from "@/config/corridas";
import { seasonOf } from "./temporada";
import type { ClaimStatus } from "@/generated/prisma/enums";

export const claimStatusLabels: Record<ClaimStatus, string> = {
  PENDENTE: "Em análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

/** Pontos de uma prova concluída: fixo por prova + por km. Ex.: 10 km = 5 + 10 = 15 pontos. */
export function pointsFor(distanceKm: number): number {
  return pontos.porProva + Math.round(distanceKm * pontos.porKm);
}

/** "1:02:33" ou "45:10" -> segundos. Devolve null se não for um tempo válido. */
export function parseFinishTime(value: string): number | null {
  const m = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return seconds > 0 ? seconds : null;
}

/** 3753 -> "1:02:33"; 2710 -> "45:10" */
export function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Ritmo plausível em segundos por km: mais rápido que recorde mundial ou mais lento que caminhada indica erro de digitação. */
export const PACE_LIMITS = { fastest: 150, slowest: 1200 };

export const claimSchema = z
  .object({
    distanceKm: z.coerce.number().positive("Escolha a distância"),
    runnerName: z
      .string()
      .trim()
      .max(120)
      .refine((v) => /\S{2,}\s+\S+/.test(v), "Informe o nome completo, como aparece no resultado"),
    bibNumber: z.string().trim().min(1, "Informe o número de peito").max(20),
    finishTime: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const seconds = parseFinishTime(v);
        if (seconds === null) {
          ctx.addIssue({ code: "custom", message: "Use o formato h:mm:ss ou mm:ss" });
          return z.NEVER;
        }
        return seconds;
      }),
    proofUrl: z
      .string()
      .trim()
      .url("Cole um link válido")
      .refine((v) => /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://")
      .max(500),
  })
  .superRefine((v, ctx) => {
    // Distância inválida já tem o próprio erro; sem ela o ritmo não faz sentido
    if (!(v.distanceKm > 0)) return;
    const pace = v.finishTime / v.distanceKm;
    if (pace < PACE_LIMITS.fastest || pace > PACE_LIMITS.slowest) {
      ctx.addIssue({ code: "custom", path: ["finishTime"], message: "Tempo incompatível com a distância informada" });
    }
  });

/** Limite da distância digitada quando a prova não tem distâncias cadastradas. */
export const MAX_FREE_KM = 100;

/** Pode enviar comprovação desta prova agora? Devolve o motivo quando não pode. */
export function claimBlockReason(
  race: { startsAt: Date; distancesKm: number[] },
  user: { premium: boolean } | null,
  input: { distanceKm: number } | null,
  now = new Date(),
): string | null {
  if (!user) return "Entre na sua conta para enviar a comprovação.";
  if (!user.premium) return "Pontos por corrida são exclusivos para assinantes Premium.";
  // Compara o dia (Brasília), não a hora: o horário das provas importadas é estimado
  const brtDay = (d: Date) => Math.floor((d.getTime() - 3 * 3600_000) / 86_400_000);
  if (brtDay(race.startsAt) > brtDay(now)) return "A comprovação abre no dia da prova.";
  if (now.getTime() - race.startsAt.getTime() > pontos.diasParaEnviar * 86_400_000) {
    return `O prazo para enviar a comprovação (${pontos.diasParaEnviar} dias após a prova) já passou.`;
  }
  // O resultado de cada temporada fecha alguns dias depois do fim; provas dela não entram mais
  const season = seasonOf(race.startsAt);
  if (now.getTime() >= season.closesAt.getTime()) return `O ranking da temporada ${season.label} já fechou.`;
  if (input && race.distancesKm.length && !race.distancesKm.includes(input.distanceKm)) return "Escolha uma das distâncias da prova.";
  // Prova sem distâncias cadastradas (comum nas importadas): aceita o que o corredor informar, e a análise confere
  if (input && !race.distancesKm.length && (input.distanceKm < 1 || input.distanceKm > MAX_FREE_KM)) {
    return `Informe uma distância entre 1 e ${MAX_FREE_KM} km.`;
  }
  return null;
}

/** "Maria Souza Lima" -> "Maria S.": o ranking é visto por outros assinantes, sem expor o nome completo. */
export function publicName(full: string): string {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Valor do campo "prova" quando o corredor informa uma prova que não está no calendário. */
export const OTHER_RACE = "outra";

/** Prova informada à mão: nome, dia (aaaa-mm-dd), cidade e UF. */
export const customRaceSchema = z.object({
  customRaceName: z.string().trim().min(3, "Informe o nome da prova").max(120),
  customRaceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da prova"),
  customCity: z.string().trim().min(2, "Informe a cidade").max(80),
  customState: z.enum(UFS, { message: "Escolha o estado" }),
});

type ClaimRaceFields = {
  race: { name: string; startsAt: Date; slug?: string } | null;
  customRaceName: string | null;
  customRaceDate: Date | null;
  customCity: string | null;
  customState: string | null;
};

/** Nome, data e local da prova de uma comprovação, seja do calendário ou informada à mão. */
export function claimRace(c: ClaimRaceFields): { name: string; date: Date | null; slug: string | null; place: string | null } {
  if (c.race) return { name: c.race.name, date: c.race.startsAt, slug: c.race.slug ?? null, place: null };
  return {
    name: c.customRaceName ?? "Prova informada",
    date: c.customRaceDate,
    slug: null,
    place: c.customCity && c.customState ? `${c.customCity}/${c.customState}` : null,
  };
}
