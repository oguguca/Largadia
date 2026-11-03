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
import { draftToRace, IMPORT_REVIEW_NOTE, MAX_LINKS_PER_BATCH, parseLinks } from "@/domain/importacao/lote";
import { addFromRegulation, draftFromRenderedPage, renderedPageSchema } from "@/domain/importacao/pagina-renderizada";
import { readPublicPdfText } from "@/domain/importacao/ler-pdf";
import { calendarPayloadSchema, cardKey, cardToRace } from "@/domain/importacao/calendario";

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
    priceKnown: true,
    timeKnown: true,
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
    // Salvar pelo formulário completo conta como revisão da importação em lote
    moderationNote: null,
  };

  if (id) {
    await db.$transaction([db.race.update({ where: { id }, data }), syncClaimDates(id, d.startsAt)]);
  } else {
    await db.race.create({ data: { ...data, source: "ADMIN" } });
  }
  updateTag(RACES_TAG);
  redirect(`/admin/corridas?salvo=${slug}`);
}

const idSchema = z.string().cuid();

/**
 * A temporada de uma corrida registrada sai de `raceDate`, copiado da prova no envio.
 * Se a data da prova muda (edição ou reimportação), os registros acompanham.
 */
function syncClaimDates(raceId: string, startsAt: Date) {
  return db.pointClaim.updateMany({ where: { raceId, raceDate: { not: startsAt } }, data: { raceDate: startsAt } });
}

/**
 * Antes de excluir uma prova, os registros de pontos dela viram "prova informada" com nome, data e cidade.
 * Sem isso, a exclusão em cascata apagaria os pontos já aprovados dos assinantes.
 */
async function deleteRaceKeepingClaims(raceId: string) {
  const race = await db.race.findUnique({ where: { id: raceId }, select: { name: true, startsAt: true, city: true, state: true } });
  if (!race) return;
  await db.$transaction([
    db.pointClaim.updateMany({
      where: { raceId },
      data: { raceId: null, customRaceName: race.name, customRaceDate: race.startsAt, customCity: race.city, customState: race.state },
    }),
    db.race.deleteMany({ where: { id: raceId } }),
  ]);
}

export async function setModeration(id: string, status: "APROVADA" | "RECUSADA") {
  await requireAdmin();
  const race = await db.race.findUnique({
    where: { id: idSchema.parse(id) },
    select: { lat: true, moderationNote: true, distancesKm: true },
  });
  if (!race) return;
  if (status === "APROVADA" && (race.moderationNote === IMPORT_REVIEW_NOTE || race.distancesKm.length === 0)) {
    // Importada em lote: preço e distâncias ainda são palpites, então a aprovação passa pela edição
    redirect(`/admin/corridas/${id}?falta=revisao`);
  }
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
  await deleteRaceKeepingClaims(idSchema.parse(id));
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

export type BatchResult = { url: string; ok: boolean; message: string; id?: string; name?: string };
export type BatchState = { results?: BatchResult[]; error?: string } | null;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Importa várias páginas de prova de uma vez. Cada uma vira corrida PENDENTE com imagem e
 * coordenadas; preço e distâncias que a página não informa ficam para a revisão no formulário.
 * Os links são processados um por vez, com pausa, para não sobrecarregar a plataforma nem o Nominatim.
 */
export async function importBatch(_prev: BatchState, form: FormData): Promise<BatchState> {
  await requireAdmin();
  const links = parseLinks(String(form.get("links") ?? ""));
  if (!links.length) return { error: "Cole ao menos um link de prova." };
  if (links.length > MAX_LINKS_PER_BATCH) return { error: `Envie no máximo ${MAX_LINKS_PER_BATCH} links por vez.` };

  const results: BatchResult[] = [];
  for (const [i, url] of links.entries()) {
    if (i > 0) await pause(1000);
    try {
      const { html, finalUrl } = await fetchPublicPage(url);
      const built = draftToRace(extractRaceDraft(html, finalUrl), finalUrl);
      if (!built.data) {
        results.push({ url, ok: false, message: `${built.error} Use o cadastro rápido.` });
        continue;
      }
      const { baseSlug, ...data } = built.data;

      const dayStart = new Date(data.startsAt.getTime() - 12 * 3600_000);
      const dayEnd = new Date(data.startsAt.getTime() + 12 * 3600_000);
      const dup = await db.race.findFirst({
        where: {
          OR: [
            { registrationUrl: { in: [url, finalUrl] } },
            { sourceUrl: { in: [url, finalUrl] } },
            { name: { equals: data.name, mode: "insensitive" }, startsAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
        select: { id: true, name: true },
      });
      if (dup) {
        results.push({ url, ok: false, message: "Já cadastrada.", id: dup.id, name: dup.name });
        continue;
      }

      const found = (await geocode(`${data.venue}, ${data.city}, ${data.state}`)) ?? (await geocode(`${data.city}, ${data.state}`));
      const race = await db.race.create({
        data: { ...data, slug: await uniqueSlug(baseSlug), lat: found?.lat ?? null, lng: found?.lng ?? null },
        select: { id: true, name: true },
      });
      results.push({ url, ok: true, message: found ? "Importada." : "Importada, sem coordenadas.", ...race });
    } catch (e) {
      results.push({ url, ok: false, message: e instanceof Error ? e.message : "Falha ao ler a página." });
    }
  }
  updateTag(RACES_TAG);
  return { results };
}

export type CalendarImportState = { created: number; updated: number; skipped: { name: string; message: string }[]; error?: string };

/** Nova data (meia-noite + 7h vinda do calendário) com o horário que já estava confirmado. */
function keepTimeOfDay(current: Date, incoming: Date): Date {
  const brtDay = (d: Date) => Math.floor((d.getTime() - 3 * 3600_000) / 86_400_000);
  return new Date(current.getTime() + (brtDay(incoming) - brtDay(current)) * 86_400_000);
}

/** Geocodes por envio; o Nominatim pede no máximo 1 por segundo. Cidades já conhecidas não contam. */
const MAX_GEOCODES_PER_IMPORT = 40;

/**
 * Grava os cartões do calendário enviados pelo favorito. Usa o ID da Ticket Sports como chave:
 * prova nova entra publicada; prova já cadastrada tem data, situação, link e imagem atualizados,
 * sem mexer no que o admin editou (nome, distâncias, descrição, preço).
 */
export async function importCalendar(payload: unknown): Promise<CalendarImportState> {
  await requireAdmin();
  const parsed = calendarPayloadSchema.safeParse(payload);
  if (!parsed.success) return { created: 0, updated: 0, skipped: [], error: "Os dados recebidos do calendário são inválidos." };

  const state: CalendarImportState = { created: 0, updated: 0, skipped: [] };
  const coords = new Map<string, { lat: number; lng: number } | null>();
  let geocodes = 0;

  for (const card of parsed.data.cards) {
    const built = cardToRace(card);
    if (!built.ok) {
      if (built.reason !== "passada") state.skipped.push({ name: card.name, message: built.message });
      continue;
    }
    const { baseSlug, ...data } = built.data;
    try {
      const existing = await db.race.findFirst({
        // Pelo ID da plataforma; o link só serve na Ticket Sports (na Yescom, provas diferentes dividem o mesmo site)
        where:
          card.source === "ticketsports"
            ? { OR: [{ externalId: data.externalId }, { registrationUrl: data.registrationUrl }, { sourceUrl: data.sourceUrl }] }
            : { externalId: data.externalId },
        select: { id: true, imageUrl: true, distancesKm: true, startsAt: true, timeKnown: true },
      });
      if (existing) {
        // Horário confirmado no admin fica; só a data acompanha a plataforma
        const startsAt = existing.timeKnown ? keepTimeOfDay(existing.startsAt, data.startsAt) : data.startsAt;
        await db.race.update({
          where: { id: existing.id },
          data: {
            externalId: data.externalId,
            startsAt,
            registrationStatus: data.registrationStatus,
            registrationClosesAt: data.registrationClosesAt,
            registrationUrl: data.registrationUrl,
            imageUrl: data.imageUrl ?? existing.imageUrl,
            ...(existing.distancesKm.length ? {} : { distancesKm: data.distancesKm }),
          },
        });
        if (startsAt.getTime() !== existing.startsAt.getTime()) await syncClaimDates(existing.id, startsAt);
        state.updated++;
        continue;
      }

      // Coordenadas: reaproveita outra prova da mesma cidade antes de consultar o geocode
      const key = `${data.citySlug}|${data.state}`;
      if (!coords.has(key)) {
        const known = await db.race.findFirst({
          where: { citySlug: data.citySlug, state: data.state, lat: { not: null } },
          select: { lat: true, lng: true },
        });
        if (known) coords.set(key, { lat: known.lat!, lng: known.lng! });
        else if (geocodes < MAX_GEOCODES_PER_IMPORT) {
          if (geocodes > 0) await pause(1000);
          geocodes++;
          coords.set(key, await geocode(`${data.city}, ${data.state}`));
        }
      }
      const found = coords.get(key) ?? null;
      await db.race.create({ data: { ...data, slug: await uniqueSlug(baseSlug), lat: found?.lat ?? null, lng: found?.lng ?? null } });
      state.created++;
    } catch (e) {
      state.skipped.push({ name: card.name, message: e instanceof Error ? e.message.slice(0, 200) : "Falha ao salvar." });
    }
  }
  updateTag(RACES_TAG);
  return state;
}

/**
 * Chaves (ID da plataforma, ou link) dos cartões que já estão no site, para a conferência descartar.
 * Recebe os próprios cartões, porque na Yescom a chave depende da data além do link.
 */
export async function knownCalendarKeys(payload: unknown): Promise<string[]> {
  await requireAdmin();
  const parsed = calendarPayloadSchema.safeParse(payload);
  if (!parsed.success) return [];
  const now = new Date();
  const cards = parsed.data.cards.map((card) => ({ card, key: cardKey(card, now) }));
  const ids = cards.map((c) => c.key).filter((k) => !k.startsWith("http"));
  const tsUrls = cards.filter((c) => c.card.source === "ticketsports").map((c) => c.card.url);
  const found = await db.race.findMany({
    where: { OR: [{ externalId: { in: ids } }, { registrationUrl: { in: tsUrls } }, { sourceUrl: { in: tsUrls } }] },
    select: { externalId: true, registrationUrl: true, sourceUrl: true },
  });
  const knownIds = new Set(found.map((r) => r.externalId).filter(Boolean));
  const knownUrls = new Set(found.flatMap((r) => [r.registrationUrl, r.sourceUrl]).filter(Boolean));
  return cards
    .filter((c) => knownIds.has(c.key) || (c.card.source === "ticketsports" && knownUrls.has(c.card.url)))
    .map((c) => c.key);
}

export type PageDraftState = { draft?: RaceDraft; error?: string; warning?: string };

/** Recebe a página enviada pelo botão do navegador e devolve o rascunho completo. Nada é salvo aqui. */
export async function draftFromPage(payload: unknown): Promise<PageDraftState> {
  await requireAdmin();
  const page = renderedPageSchema.safeParse(payload);
  if (!page.success) return { error: "Os dados recebidos da página são inválidos." };
  const draft = draftFromRenderedPage(page.data);

  // Muitas provas só informam distância e preço no regulamento em PDF
  const missing: string[] = [];
  for (const pdf of page.data.pdfs.slice(0, 2)) {
    if (draft.distances?.length && draft.priceMin !== undefined) break;
    try {
      addFromRegulation(draft, await readPublicPdfText(pdf));
    } catch {
      // PDF ilegível ou fora do ar: segue com o que a página trouxe
    }
  }
  if (!draft.distances?.length) missing.push("distâncias");
  if (draft.priceMin === undefined) missing.push("preço");

  const dup = await db.race.findFirst({
    where: {
      OR: [
        { registrationUrl: page.data.url },
        { sourceUrl: page.data.url },
        ...(draft.name ? [{ name: { equals: draft.name, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { name: true },
  });
  const warnings = [
    dup && `Atenção: parece já existir "${dup.name}". Confira antes de salvar.`,
    missing.length && `A página e o regulamento não informam ${missing.join(" nem ")}: preencha à mão.`,
  ].filter(Boolean);
  return { draft, warning: warnings.join(" ") || undefined };
}

/** Remoção direto da lista do admin (a confirmação fica no próprio botão). */
export async function removeRace(id: string) {
  await requireAdmin();
  // Não falha se a corrida já tiver sido removida em outra aba
  await deleteRaceKeepingClaims(idSchema.parse(id));
  updateTag(RACES_TAG);
  redirect("/admin/corridas?excluida=1");
}

const distancesSchema = z.array(z.number().min(0.5).max(300)).min(1, "Escolha ao menos uma distância").max(12);

/**
 * Completa as distâncias de uma prova importada sem elas (tela "Sem distância").
 * Só grava se a prova ainda estiver sem distância: não sobrescreve o que foi revisado na edição completa.
 */
export async function setRaceDistances(id: string, distances: number[]): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = distancesSchema.safeParse(
    [...new Set(distances.map((d) => Math.round(d * 1000) / 1000))].sort((a, b) => a - b),
  );
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Distância inválida" };
  const done = await db.race.updateMany({
    where: { id: idSchema.parse(id), distancesKm: { isEmpty: true } },
    data: { distancesKm: parsed.data },
  });
  if (!done.count) return { error: "Essa prova já tem distância. Atualize a página." };
  updateTag(RACES_TAG);
  return {};
}