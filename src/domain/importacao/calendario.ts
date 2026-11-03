import { z } from "zod";
import { UFS } from "@/config/corridas";
import { parseDateBrt } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import type { RegistrationStatus } from "@/generated/prisma/enums";
import { extractDistances, inferFromName, tidyName } from "./extrair";

export const MAX_CARDS_PER_IMPORT = 500;

/** Calendários que o favorito sabe ler. */
export const CALENDAR_SOURCES = ["ticketsports", "yescom"] as const;
export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

const SOURCE_NAMES: Record<CalendarSource, string> = { ticketsports: "Ticket Sports", yescom: "Yescom" };

/** Cartão de um calendário (Ticket Sports ou Yescom), como o favorito lê da tela. */
export const calendarCardSchema = z.object({
  source: z.enum(CALENDAR_SOURCES).default("ticketsports"),
  // .url() aceita javascript:, então o esquema é conferido à parte
  url: z.string().url().max(500).refine((v) => /^https?:\/\//i.test(v), "Link precisa ser http(s)"),
  name: z.string().trim().min(1).max(200),
  image: z.string().url().max(500).refine((v) => /^https?:\/\//i.test(v)).optional().catch(undefined),
  lines: z.array(z.string().max(300)).max(10),
  /** Situação marcada no cartão (Yescom: aberto, esgotado, breve, expo, atencao) */
  status: z.string().trim().max(30).optional().catch(undefined),
});
export type CalendarCard = z.infer<typeof calendarCardSchema>;

export const calendarPayloadSchema = z.object({ cards: z.array(calendarCardSchema).min(1).max(MAX_CARDS_PER_IMPORT) });

/** Itens do calendário que não são provas (taxas, cursos, feiras…) e não entram na agenda. */
const NOT_A_RACE = /\b(taxa|transfer[eê]ncia|curso|workshop|palestra|webinar|monitoramento|clinica|clínica|expo)\b/i;

/** "https://www.ticketsports.com.br/e/corrida-das-flores-2026-85431" -> "ticketsports:85431" */
export function ticketSportsId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!/(^|\.)ticketsports\.com\.br$/.test(u.hostname)) return undefined;
    const m = /^\/e\/[^/]*?-(\d+)\/?$/.exec(u.pathname);
    return m ? `ticketsports:${m[1]}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * "https://www.yescom.com.br/maratonasp/2026/index.asp" + 2026-04-12 -> "yescom:maratonasp/2026:2026-04-12".
 * Link para o próprio calendário (prova "em breve") -> "yescom:evento/<nome>:<data>".
 * A data entra na chave porque provas diferentes da Yescom às vezes usam o mesmo site (ex.: Maratona e Corrida das Nações).
 */
export function yescomId(url: string, date: string, name: string): string | undefined {
  try {
    const u = new URL(url);
    if (!/(^|\.)yescom\.com\.br$/.test(u.hostname)) return undefined;
    // Provas "em breve" ainda sem site apontam para o próprio calendário: aí o nome identifica a prova
    if (u.pathname.startsWith("/site/")) return `yescom:evento/${slugify(name)}:${date}`;
    const path = u.pathname.replace(/\/index\.\w+$/i, "").replace(/^\/+|\/+$/g, "");
    return path ? `yescom:${path}:${date}` : undefined;
  } catch {
    return undefined;
  }
}

/** "dd/mm/aaaa" depois do rótulo, em aaaa-mm-dd. */
function dateAfter(lines: string[], label: RegExp): string | undefined {
  for (const line of lines) {
    if (!label.test(line.normalize("NFC"))) continue;
    const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(line);
    // 31/02 e afins contam como "sem data", em vez de virar março
    if (m && parseDateBrt(`${m[3]}-${m[2]}-${m[1]}`)) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return undefined;
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

/** "25 Janeiro 2026" ou "14 e 15 Agosto 2026" -> "2026-01-25" (primeiro dia). */
export function parseWrittenDate(text: string): string | undefined {
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const m = /(\d{1,2})(?:\s*(?:a|e|-)\s*\d{1,2})?\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})/.exec(plain);
  const month = m && MONTHS[m[2]];
  if (!m || !month) return undefined;
  const iso = `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return parseDateBrt(iso) ? iso : undefined;
}

/** Capitais, para quando o calendário só informa o local e a UF. */
const CAPITALS: Record<string, string> = {
  AC: "Rio Branco", AL: "Maceió", AP: "Macapá", AM: "Manaus", BA: "Salvador", CE: "Fortaleza", DF: "Brasília",
  ES: "Vitória", GO: "Goiânia", MA: "São Luís", MT: "Cuiabá", MS: "Campo Grande", MG: "Belo Horizonte", PA: "Belém",
  PB: "João Pessoa", PR: "Curitiba", PE: "Recife", PI: "Teresina", RJ: "Rio de Janeiro", RN: "Natal", RS: "Porto Alegre",
  RO: "Porto Velho", RR: "Boa Vista", SC: "Florianópolis", SP: "São Paulo", SE: "Aracaju", TO: "Palmas",
};

/** Situações da Yescom -> situação das inscrições. Expo e "Atenção" não são provas a cadastrar. */
const YESCOM_STATUS: Record<string, RegistrationStatus> = { aberto: "ABERTAS", esgotado: "ESGOTADAS", breve: "EM_BREVE" };

export type CardResult =
  | { ok: true; data: ReturnType<typeof buildData> }
  | { ok: false; reason: "nao-e-prova" | "passada" | "incompleta"; message: string };

type Parsed = {
  externalId: string;
  date: string;
  city: string;
  state: string;
  venue: string;
  closesOn?: string;
  status?: RegistrationStatus;
};

function buildData(card: CalendarCard, p: Parsed, now: Date) {
  const name = tidyName(card.name);
  const fromName = inferFromName(name);
  const distances = extractDistances(name);
  // O cartão não mostra o horário; 7h é o mais comum e o admin ajusta se precisar
  const startsAt = new Date(parseDateBrt(p.date)!.getTime() + 7 * 3600_000);
  const closes = p.closesOn ? parseDateBrt(p.closesOn) : null;
  const year = p.date.slice(0, 4);
  // "Inscrições até" passou do fim do dia: encerradas
  const closedByDate = closes && closes.getTime() + 24 * 3600_000 <= now.getTime();
  return {
    externalId: p.externalId,
    baseSlug: slugify(name.includes(year) ? name : `${name} ${year}`),
    name,
    startsAt,
    timeKnown: false,
    registrationClosesAt: closes,
    city: p.city,
    citySlug: slugify(p.city),
    state: p.state,
    venue: p.venue,
    // "Maratona X - Corrida das Nações" é a prova curta do fim de semana da maratona, não 42 km
    distancesKm: distances.length ? distances : /corrida das na[çc][õo]es/i.test(name) ? [] : fromName.distances,
    type: fromName.type,
    priceMinCents: 0,
    priceMaxCents: 0,
    priceKnown: false,
    registrationUrl: card.url,
    registrationStatus: closedByDate ? "ENCERRADAS" : (p.status ?? "ABERTAS"),
    organizer: card.source === "yescom" ? "Yescom" : "A confirmar",
    description: `${name}, em ${p.city}/${p.state}. Inscrições no site da ${SOURCE_NAMES[card.source]}.`,
    imageUrl: card.image ?? null,
    sourceUrl: card.url,
    moderationStatus: "APROVADA",
    moderationNote: null,
    source: "ADMIN",
  } as const;
}

/** Cartão da Ticket Sports: "Cidade, UF", "Data do evento: dd/mm/aaaa", "Inscrições até: dd/mm/aaaa". */
function parseTicketSports(card: CalendarCard): Parsed | undefined {
  const externalId = ticketSportsId(card.url);
  const date = dateAfter(card.lines, /data do evento/i);
  const place = card.lines.map((l) => /^(.+?),\s*([A-Z]{2})$/.exec(l.trim())).find((m) => m && (UFS as readonly string[]).includes(m[2]));
  if (!externalId || !date || !place) return undefined;
  const city = place[1].trim();
  return { externalId, date, city, state: place[2], venue: city, closesOn: dateAfter(card.lines, /inscri[çc][õo]es at[ée]/i) };
}

/** Cartão da Yescom: "25 Janeiro 2026" e "Local • UF"; a cidade vem do nome da prova ou da capital da UF. */
function parseYescom(card: CalendarCard): Parsed | undefined {
  const date = card.lines.map(parseWrittenDate).find(Boolean);
  const place = card.lines.map((l) => /^(.+?)\s*[•·]\s*([A-Z]{2})$/.exec(l.trim())).find((m) => m && (UFS as readonly string[]).includes(m[2]));
  if (!date || !place) return undefined;
  const externalId = yescomId(card.url, date, card.name);
  if (!externalId) return undefined;
  const state = place[2];
  const plainName = card.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const city =
    state === "RJ" && /\brio\b/.test(plainName)
      ? "Rio de Janeiro"
      : state === "MG" && /\b(bh|pampulha|belo horizonte)\b/.test(plainName)
        ? "Belo Horizonte"
        : CAPITALS[state];
  return { externalId, date, city, state, venue: place[1].trim(), status: YESCOM_STATUS[card.status ?? ""] };
}

/** Converte um cartão do calendário nos dados da corrida. Provas passadas e itens que não são provas ficam de fora. */
export function cardToRace(card: CalendarCard, now = new Date()): CardResult {
  if (NOT_A_RACE.test(card.name) || card.status === "expo") return { ok: false, reason: "nao-e-prova", message: "Não parece uma prova." };
  if (card.status === "atencao") return { ok: false, reason: "nao-e-prova", message: "Evento com alteração anunciada; confira no site." };
  const parsed = card.source === "yescom" ? parseYescom(card) : parseTicketSports(card);
  if (!parsed) return { ok: false, reason: "incompleta", message: "Cartão sem link, data ou local." };

  const data = buildData(card, parsed, now);
  // Mantém as provas de hoje; some só no dia seguinte
  if (data.startsAt.getTime() + 24 * 3600_000 < now.getTime()) return { ok: false, reason: "passada", message: "Já aconteceu." };
  return { ok: true, data };
}

/** Chave que identifica o cartão: o ID da plataforma quando dá para montar, senão o link. */
export function cardKey(card: CalendarCard, now = new Date()): string {
  const built = cardToRace(card, now);
  return built.ok ? built.data.externalId : card.url;
}
