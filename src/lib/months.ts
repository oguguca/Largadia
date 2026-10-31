export const MONTHS = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/** Nome do mês com acento, para exibição. */
export const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

export function monthPath(year: number, month: number): string {
  return `/calendario/${year}/${MONTHS[month - 1]}`;
}

/** "/calendario/2026/novembro" -> { year: 2026, month: 11 }; aceita "março" e "marco". */
export function parseMonth(yearParam: string, monthParam: string): { year: number; month: number } | null {
  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  const name = decodeURIComponent(monthParam).toLowerCase().replace("ç", "c");
  const idx = MONTHS.indexOf(name as (typeof MONTHS)[number]);
  return idx < 0 ? null : { year, month: idx + 1 };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
