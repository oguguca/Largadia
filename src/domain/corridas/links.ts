import { defaultParams, partnerParams, platformNames } from "@/config/parceiros";

/** "https://www.ticketsports.com.br/e/x" -> "ticketsports.com.br" (domínio conhecido) ou o host sem www. */
export function platformOf(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "desconhecido";
  }
  const known = Object.keys(partnerParams).find((d) => host === d || host.endsWith(`.${d}`));
  return known ?? host;
}

export function platformName(url: string): string | undefined {
  return platformNames[platformOf(url)];
}

/** Acrescenta os parâmetros de rastreamento sem sobrescrever os que já existem no link. */
export function trackedUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return url;
  const params = partnerParams[platformOf(url)] ?? defaultParams;
  for (const [k, v] of Object.entries(params)) {
    if (!parsed.searchParams.has(k)) parsed.searchParams.set(k, v);
  }
  return parsed.toString();
}

/** Links para adicionar a prova à agenda. A prova dura, por padrão, 3 horas. */
export function googleCalendarUrl(race: { name: string; startsAt: Date; venue: string; city: string; state: string; slug: string }, siteUrl: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(race.startsAt.getTime() + 3 * 3600_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: race.name,
    dates: `${fmt(race.startsAt)}/${fmt(end)}`,
    location: `${race.venue}, ${race.city} - ${race.state}`,
    details: `Detalhes e inscrição: ${siteUrl}/corrida/${race.slug}`,
    ctz: "America/Sao_Paulo",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Arquivo .ics (RFC 5545) com um único evento. */
export function raceIcs(race: { id: string; name: string; startsAt: Date; venue: string; city: string; state: string; slug: string }, siteUrl: string, now: Date): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
  const end = new Date(race.startsAt.getTime() + 3 * 3600_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Largadia//Agenda de corridas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${race.id}@largadia`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(race.startsAt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(race.name)}`,
    `LOCATION:${esc(`${race.venue}, ${race.city} - ${race.state}`)}`,
    `URL:${siteUrl}/corrida/${race.slug}`,
    `DESCRIPTION:${esc(`Detalhes e inscrição: ${siteUrl}/corrida/${race.slug}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
