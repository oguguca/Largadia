import { UFS } from "@/config/corridas";

/** Rascunho de corrida extraído de uma página. Todos os campos são sugestões para o admin revisar. */
export type RaceDraft = {
  name?: string;
  date?: string; // AAAA-MM-DD
  time?: string; // HH:MM
  city?: string;
  state?: string;
  venue?: string;
  distances?: number[];
  description?: string;
  organizer?: string;
  /** Imagem encontrada na página. Não é preenchida automaticamente: só use com autorização. */
  imageSuggestion?: string;
  registrationUrl: string;
};

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function meta(html: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = re.exec(html);
  const v = m?.[1] ?? m?.[2];
  return v ? decodeEntities(v).trim() : undefined;
}

/** Procura um objeto schema.org Event (ou subtipo) nos blocos JSON-LD. */
function findJsonLdEvent(html: string): Record<string, unknown> | undefined {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, raw] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(raw.trim());
    } catch {
      continue;
    }
    const queue: unknown[] = [data];
    while (queue.length) {
      const item = queue.shift();
      if (Array.isArray(item)) queue.push(...item);
      else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const type = obj["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => typeof t === "string" && /Event$/.test(t))) return obj;
        if (obj["@graph"]) queue.push(obj["@graph"]);
      }
    }
  }
}

function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** "Trilhas Secretas — Inscrições | MovNow" -> "Trilhas Secretas" */
export function cleanTitle(title: string): string {
  return title
    .split(/\s[|–—-]\s/)[0]
    .replace(/\binscri[çc][õo]es\b/gi, "")
    .trim();
}

/** Distâncias citadas no texto: "5K", "10 km", "21,1km", "42km". Ignora valores fora de 0,5–250 km. */
export function extractDistances(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(/(\d{1,3}(?:[.,]\d{1,3})?)\s?(?:km|k)\b/gi)) {
    const n = Number(m[1].replace(",", "."));
    if (n >= 0.5 && n <= 250) found.add(n);
  }
  return [...found].sort((a, b) => a - b).slice(0, 8);
}

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Primeira data do texto: "20/11/2026", "20 de novembro de 2026". */
export function extractDate(text: string): string | undefined {
  const pad = (n: number) => String(n).padStart(2, "0");
  const numeric = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
  if (numeric) return `${numeric[3]}-${pad(+numeric[2])}-${pad(+numeric[1])}`;
  const long = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MONTHS_PT.join("|")}|marco)\\s+(?:de\\s+)?(20\\d{2})`, "i").exec(text);
  if (long) {
    const month = MONTHS_PT.indexOf(long[2].toLowerCase().replace("marco", "março")) + 1;
    return `${long[3]}-${pad(month)}-${pad(+long[1])}`;
  }
}

/** "São Paulo/SP", "São Paulo - SP", "São Paulo, SP" */
export function extractCityState(text: string): { city: string; state: string } | undefined {
  const re = /([A-ZÀ-Ú][\p{L}' ]{1,40}?)\s?(?:\/|-|,)\s?([A-Z]{2})\b/gu;
  for (const m of text.matchAll(re)) {
    if ((UFS as readonly string[]).includes(m[2])) return { city: m[1].trim(), state: m[2] };
  }
}

/** Monta o rascunho a partir do HTML. Prioridade: JSON-LD > OpenGraph > texto. */
export function extractRaceDraft(html: string, url: string): RaceDraft {
  const draft: RaceDraft = { registrationUrl: url };
  const ev = findJsonLdEvent(html);

  if (ev) {
    if (typeof ev.name === "string") draft.name = ev.name.trim();
    if (typeof ev.startDate === "string") {
      const d = new Date(ev.startDate);
      if (!Number.isNaN(d.getTime())) {
        // Converte para horário de Brasília
        const brt = new Date(d.getTime() - 3 * 3600_000).toISOString();
        draft.date = brt.slice(0, 10);
        if (/T\d{2}:\d{2}/.test(ev.startDate)) draft.time = brt.slice(11, 16);
      }
    }
    const loc = ev.location as Record<string, unknown> | undefined;
    if (loc && typeof loc === "object") {
      if (typeof loc.name === "string") draft.venue = loc.name.trim();
      const addr = loc.address as Record<string, unknown> | undefined;
      if (addr && typeof addr === "object") {
        if (typeof addr.addressLocality === "string") draft.city = addr.addressLocality.trim();
        if (typeof addr.addressRegion === "string" && /^[A-Z]{2}$/.test(addr.addressRegion.trim())) {
          draft.state = addr.addressRegion.trim();
        }
      }
    }
    const org = ev.organizer as Record<string, unknown> | undefined;
    if (org && typeof org.name === "string") draft.organizer = org.name.trim();
    if (typeof ev.description === "string") draft.description = ev.description.trim();
    const img = Array.isArray(ev.image) ? ev.image[0] : ev.image;
    if (typeof img === "string") draft.imageSuggestion = img;
  }

  const title = meta(html, "og:title") ?? /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  draft.name ??= title ? cleanTitle(decodeEntities(title)) : undefined;
  const ogDesc = meta(html, "og:description") ?? meta(html, "description");
  draft.description ??= ogDesc && ogDesc.length > 40 ? ogDesc : undefined;
  draft.imageSuggestion ??= meta(html, "og:image");

  const text = visibleText(html);
  if (!draft.city || !draft.state) {
    const cs = (ogDesc && extractCityState(ogDesc)) || extractCityState(text);
    if (cs) {
      draft.city ??= cs.city;
      draft.state ??= cs.state;
    }
  }
  draft.date ??= extractDate(text);
  const distances = extractDistances(`${draft.name ?? ""} ${draft.description ?? ""} ${text}`);
  if (distances.length) draft.distances = distances;

  return draft;
}
