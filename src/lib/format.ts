import { TIMEZONE } from "./dates";

const dateLong = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateShort = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "short" });
const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatDateLong = (d: Date) => dateLong.format(d);
export const formatDateShort = (d: Date) => dateShort.format(d).replace(".", "");
export const formatTime = (d: Date) => time.format(d);

export function formatPriceRange(minCents: number, maxCents: number): string {
  if (maxCents === 0) return "Gratuita";
  if (minCents === maxCents) return brl.format(minCents / 100);
  if (minCents === 0) return `Grátis a ${brl.format(maxCents / 100)}`;
  return `${brl.format(minCents / 100)} a ${brl.format(maxCents / 100)}`;
}

/** 21.1 -> "21k", 42.195 -> "42k", 7.5 -> "7,5k" */
export function formatDistance(km: number): string {
  if (km >= 21 && km < 22) return "21k";
  if (km >= 42 && km < 43) return "42k";
  return `${String(Number.isInteger(km) ? km : km.toFixed(1)).replace(".", ",")}k`;
}
