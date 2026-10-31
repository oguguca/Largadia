import { z } from "zod";
import { UFS } from "@/config/corridas";
import { parseDateBrt } from "@/lib/dates";

const httpsUrl = z
  .string()
  .trim()
  .url("Informe um link válido")
  .refine((v) => /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://");

const money = z.coerce.number({ message: "Informe um valor" }).min(0).max(10_000);

/** Valida o envio do formulário público de organizadores. */
export const raceSubmissionSchema = z
  .object({
    name: z.string().trim().min(5, "Nome muito curto").max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido"),
    city: z.string().trim().min(2, "Informe a cidade").max(80),
    state: z.enum(UFS, { message: "Escolha o estado" }),
    venue: z.string().trim().min(3, "Informe o local de largada").max(160),
    distances: z
      .array(z.coerce.number().positive().max(300))
      .min(1, "Escolha ao menos uma distância")
      .max(10),
    type: z.enum(["RUA", "TRAIL", "NOTURNA", "TEMATICA", "SOLIDARIA", "KIDS"], { message: "Escolha o tipo" }),
    priceMin: money,
    priceMax: money,
    registrationUrl: httpsUrl,
    registrationStatus: z.enum(["ABERTAS", "EM_BREVE", "ESGOTADAS", "ENCERRADAS"]),
    registrationOpensAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    organizer: z.string().trim().min(2, "Informe o organizador").max(120),
    organizerEmail: z.string().trim().email("E-mail inválido").max(160),
    description: z.string().trim().min(30, "Descreva a prova com pelo menos 30 caracteres").max(5000),
    imageUrl: httpsUrl.optional().or(z.literal("").transform(() => undefined)),
    consent: z.literal("on", { message: "Confirme que as informações são verdadeiras" }),
  })
  .refine((d) => d.priceMax >= d.priceMin, { path: ["priceMax"], message: "O valor máximo deve ser maior ou igual ao mínimo" })
  .transform((d) => {
    const day = parseDateBrt(d.date)!;
    const [h, m] = d.time.split(":").map(Number);
    const startsAt = new Date(day.getTime() + (h * 60 + m) * 60_000);
    return {
      ...d,
      startsAt,
      registrationOpensAt: d.registrationOpensAt ? parseDateBrt(d.registrationOpensAt)! : undefined,
      distances: [...new Set(d.distances)].sort((a, b) => a - b),
    };
  })
  .refine((d) => d.startsAt.getTime() > Date.now(), { path: ["date"], message: "A data da prova deve ser futura" });

export type RaceSubmission = z.output<typeof raceSubmissionSchema>;

/** Lê o FormData do formulário, juntando distâncias marcadas e a "outra distância". */
export function formDataToSubmission(form: FormData) {
  const distances = form.getAll("distances").map(String);
  const other = String(form.get("otherDistance") ?? "").replace(",", ".").trim();
  if (other) distances.push(other);
  const obj: Record<string, unknown> = Object.fromEntries(form.entries());
  obj.distances = distances;
  return obj;
}
