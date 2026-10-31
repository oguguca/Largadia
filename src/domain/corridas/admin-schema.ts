import { z } from "zod";
import { UFS } from "@/config/corridas";
import { parseDateBrt } from "@/lib/dates";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const httpUrl = z
  .string()
  .trim()
  .url("Informe um link válido")
  .refine((v) => /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://");

const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : undefined))
    .pipe(z.number().min(min).max(max).optional());

/** Formulário de corrida do admin. Diferente do envio público, aceita datas passadas e campos de parceria. */
export const adminRaceSchema = z
  .object({
    name: z.string().trim().min(3, "Nome muito curto").max(120),
    slug: optionalText(140).refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Use só letras minúsculas, números e hífens"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido"),
    city: z.string().trim().min(2, "Informe a cidade").max(80),
    state: z.enum(UFS, { message: "Escolha o estado" }),
    venue: z.string().trim().min(2, "Informe o local de largada").max(160),
    distances: z
      .string()
      .trim()
      .min(1, "Informe ao menos uma distância")
      .transform((v) =>
        [...new Set(v.split(/[;\s]+/).map((x) => Number(x.replace(",", "."))))]
          .filter((n) => n > 0)
          .sort((a, b) => a - b),
      )
      .pipe(z.array(z.number().positive().max(300)).min(1, "Distâncias inválidas").max(10)),
    type: z.enum(["RUA", "TRAIL", "NOTURNA", "TEMATICA", "SOLIDARIA", "KIDS"]),
    priceMin: z.coerce.number().min(0).max(10_000),
    priceMax: z.coerce.number().min(0).max(10_000),
    registrationUrl: httpUrl,
    registrationStatus: z.enum(["ABERTAS", "EM_BREVE", "ESGOTADAS", "ENCERRADAS"]),
    registrationOpensAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    organizer: z.string().trim().min(2, "Informe o organizador").max(120),
    organizerEmail: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("").transform(() => undefined)),
    description: z.string().trim().min(10, "Descrição muito curta").max(5000),
    imageUrl: httpUrl.optional().or(z.literal("").transform(() => undefined)),
    sourceUrl: httpUrl.optional().or(z.literal("").transform(() => undefined)),
    lat: optionalNumber(-34, 6),
    lng: optionalNumber(-74, -28),
    couponCode: optionalText(40),
    couponLabel: optionalText(40),
    featured: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
    featuredOrder: optionalNumber(0, 999),
    moderationStatus: z.enum(["PENDENTE", "APROVADA", "RECUSADA"]),
  })
  .refine((d) => d.priceMax >= d.priceMin, { path: ["priceMax"], message: "O máximo deve ser maior ou igual ao mínimo" })
  .refine((d) => (d.lat === undefined) === (d.lng === undefined), { path: ["lat"], message: "Informe latitude e longitude juntas" })
  .transform((d) => {
    const [h, m] = d.time.split(":").map(Number);
    return {
      ...d,
      startsAt: new Date(parseDateBrt(d.date)!.getTime() + (h * 60 + m) * 60_000),
      registrationOpensAt: d.registrationOpensAt ? parseDateBrt(d.registrationOpensAt)! : null,
    };
  });

export type AdminRaceInput = z.output<typeof adminRaceSchema>;
