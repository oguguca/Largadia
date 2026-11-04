import { UFS } from "@/config/corridas";
import { parseDateBrt } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import type { RaceDraft } from "./extrair";

export const MAX_LINKS_PER_BATCH = 15;

/**
 * Nota gravada nas provas importadas em lote. Enquanto ela existir, a prova não pode
 * ser aprovada direto da lista: preço e distâncias não vêm da página e precisam de revisão.
 */
export const IMPORT_REVIEW_NOTE = "Importada em lote: confira preço, distâncias e descrição antes de publicar.";

/** Links http(s) únicos colados no lote (um por linha ou separados por espaço/vírgula). */
export function parseLinks(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    if (!part) continue;
    try {
      const url = new URL(part);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      url.hash = "";
      seen.add(url.toString());
    } catch {
      // ignora textos que não são links
    }
  }
  return [...seen];
}

/** Dados da corrida montados a partir do rascunho, sem coordenadas (o geocode fica com a action). */
export function draftToRace(draft: RaceDraft, sourceUrl: string) {
  const missing = [
    !draft.name && "nome",
    !draft.date && "data",
    !draft.city && "cidade",
    !(draft.state && (UFS as readonly string[]).includes(draft.state)) && "estado",
  ].filter(Boolean);
  if (missing.length) return { error: `Não encontrei ${missing.join(", ")} na página.`, data: undefined };

  const name = draft.name!;
  const city = draft.city!;
  const state = draft.state!;
  const [h, m] = (draft.time ?? "07:00").split(":").map(Number);
  const startsAt = new Date(parseDateBrt(draft.date!)!.getTime() + (h * 60 + m) * 60_000);
  const year = new Date(startsAt.getTime() - 3 * 3600_000).getUTCFullYear();

  return {
    error: undefined,
    data: {
      baseSlug: slugify(name.includes(String(year)) ? name : `${name} ${year}`),
      name,
      startsAt,
      city,
      citySlug: slugify(city),
      state,
      venue: draft.venue || city,
      distancesKm: draft.distances ?? ([] as number[]),
      type: draft.type ?? "RUA",
      priceMinCents: 0,
      priceMaxCents: 0,
      registrationUrl: draft.registrationUrl,
      registrationStatus: "ABERTAS",
      organizer: draft.organizer || "A confirmar",
      description: draft.description || `${name}, em ${city}/${state}.`,
      imageUrl: draft.imageUrl ?? null,
      sourceUrl,
      moderationStatus: "PENDENTE",
      moderationNote: IMPORT_REVIEW_NOTE,
      source: "ADMIN",
    } as const,
  };
}
