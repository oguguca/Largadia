/** Dia em Brasília (AAAA-MM-DD) de um instante. */
export function dayKeyBrt(date: Date): string {
  return new Date(date.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

/** Série contínua dos últimos `days` dias até `today`, com zero nos dias sem registro. */
export function fillDailySeries(rows: { day: string; count: number }[], today: Date, days: number): { day: string; count: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const day = dayKeyBrt(new Date(today.getTime() - (days - 1 - i) * 86_400_000));
    return { day, count: byDay.get(day) ?? 0 };
  });
}
