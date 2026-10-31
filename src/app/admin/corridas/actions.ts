"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { geocode } from "@/lib/geocode";
import { adminRaceSchema } from "@/domain/corridas/admin-schema";
import { RACES_TAG } from "@/domain/corridas/queries";
import { fetchPublicPage } from "@/domain/importacao/buscar-pagina";
import { extractRaceDraft, type RaceDraft } from "@/domain/importacao/extrair";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  values?: Record<string, string>;
} | null;

function collectErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) (errors[String(issue.path[0] ?? "form")] ??= []).push(issue.message);
  return errors;
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const taken = await db.race.findMany({
    where: { slug: { startsWith: base }, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
    select: { slug: true },
  });
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** Cria (sem id) ou atualiza (com id) uma corrida. */
export async function saveRace(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = adminRaceSchema.safeParse(values);
  if (!parsed.success) return { errors: collectErrors(parsed.error.issues), values };
  const d = parsed.data;

  let { lat, lng } = d;
  if (lat === undefined) {
    const found = (await geocode(`${d.venue}, ${d.city}, ${d.state}`)) ?? (await geocode(`${d.city}, ${d.state}`));
    lat = found?.lat;
    lng = found?.lng;
  }
  if (d.moderationStatus === "APROVADA" && lat === undefined) {
    return {
      errors: { lat: ["Não achamos as coordenadas automaticamente. Informe latitude e longitude para aprovar."] },
      values,
    };
  }

  const year = new Date(d.startsAt.getTime() - 3 * 3600_000).getUTCFullYear();
  const slug = await uniqueSlug(d.slug ?? slugify(d.name.includes(String(year)) ? d.name : `${d.name} ${year}`), id ?? undefined);

  const data = {
    slug,
    name: d.name,
    startsAt: d.startsAt,
    city: d.city,
    citySlug: slugify(d.city),
    state: d.state,
    venue: d.venue,
    distancesKm: d.distances,
    type: d.type,
    priceMinCents: Math.round(d.priceMin * 100),
    priceMaxCents: Math.round(d.priceMax * 100),
    registrationUrl: d.registrationUrl,
    registrationStatus: d.registrationStatus,
    registrationOpensAt: d.registrationOpensAt,
    organizer: d.organizer,
    organizerEmail: d.organizerEmail ?? null,
    description: d.description,
    imageUrl: d.imageUrl ?? null,
    sourceUrl: d.sourceUrl ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    couponCode: d.couponCode ?? null,
    couponLabel: d.couponLabel ?? null,
    featured: d.featured,
    featuredOrder: d.featuredOrder ?? null,
    moderationStatus: d.moderationStatus,
  };

  if (id) {
    await db.race.update({ where: { id }, data });
  } else {
    await db.race.create({ data: { ...data, source: "ADMIN" } });
  }
  updateTag(RACES_TAG);
  redirect(`/admin/corridas?salvo=${slug}`);
}

const idSchema = z.string().cuid();

export async function setModeration(id: string, status: "APROVADA" | "RECUSADA") {
  await requireAdmin();
  const race = await db.race.findUnique({ where: { id: idSchema.parse(id) }, select: { lat: true } });
  if (!race) return;
  if (status === "APROVADA" && race.lat === null) {
    // Sem coordenadas a prova não entra no mapa: manda para a edição completar
    redirect(`/admin/corridas/${id}?falta=coordenadas`);
  }
  await db.race.update({ where: { id }, data: { moderationStatus: status } });
  updateTag(RACES_TAG);
}

export async function deleteRace(id: string, form: FormData) {
  await requireAdmin();
  if (form.get("confirmar") !== "EXCLUIR") redirect(`/admin/corridas/${id}?erro=confirmacao`);
  await db.race.delete({ where: { id: idSchema.parse(id) } });
  updateTag(RACES_TAG);
  redirect("/admin/corridas?excluida=1");
}

export type ImportState = { draft?: RaceDraft; error?: string } | null;

/** Lê a página oficial da prova e devolve um rascunho para o formulário. Nada é salvo aqui. */
export async function importFromUrl(_prev: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin();
  const url = z.string().trim().url().safeParse(form.get("url"));
  if (!url.success) return { error: "Cole um link válido." };
  try {
    const { html, finalUrl } = await fetchPublicPage(url.data);
    const draft = extractRaceDraft(html, finalUrl);
    const dup = draft.name
      ? await db.race.findFirst({
          where: { OR: [{ registrationUrl: finalUrl }, { sourceUrl: finalUrl }, { name: { equals: draft.name, mode: "insensitive" } }] },
          select: { name: true, id: true },
        })
      : null;
    return { draft, error: dup ? `Atenção: parece já existir "${dup.name}". Confira antes de salvar.` : undefined };
  } catch (e) {
    return { error: e instanceof Error ? `Não foi possível ler a página: ${e.message}` : "Não foi possível ler a página." };
  }
}
