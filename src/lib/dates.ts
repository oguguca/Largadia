/** O Brasil (horário de Brasília) não tem horário de verão desde 2019: UTC-3 fixo. */
export const BRT_OFFSET_HOURS = -3;
export const TIMEZONE = "America/Sao_Paulo";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Meia-noite (horário de Brasília) do dia de `date`, como instante UTC. */
export function startOfDayBrt(date: Date): Date {
  const shifted = new Date(date.getTime() + BRT_OFFSET_HOURS * 3600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - BRT_OFFSET_HOURS * 3600_000);
}

/** Dia da semana em Brasília (0 = domingo). */
export function weekdayBrt(date: Date): number {
  return new Date(date.getTime() + BRT_OFFSET_HOURS * 3600_000).getUTCDay();
}

/**
 * Janela do fim de semana atual ou próximo: de sábado 00:00 até segunda 00:00.
 * Se hoje já é sábado ou domingo, usa o fim de semana corrente a partir de agora.
 */
export function weekendWindow(now: Date): { start: Date; end: Date } {
  const today = startOfDayBrt(now);
  const wd = weekdayBrt(now);
  if (wd === 6 || wd === 0) {
    const saturday = new Date(today.getTime() - (wd === 0 ? DAY_MS : 0));
    return { start: now, end: new Date(saturday.getTime() + 2 * DAY_MS) };
  }
  const saturday = new Date(today.getTime() + (6 - wd) * DAY_MS);
  return { start: saturday, end: new Date(saturday.getTime() + 2 * DAY_MS) };
}

/** Converte "AAAA-MM-DD" (data do formulário, em Brasília) para o início do dia em UTC. */
export function parseDateBrt(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, day] = [+m[1], +m[2], +m[3]];
  const d = new Date(Date.UTC(y, mo - 1, day, -BRT_OFFSET_HOURS));
  // Date.UTC aceita 30/02 e 13/2026 e "transborda" para o mês seguinte: aqui isso é data inválida
  const check = new Date(Date.UTC(y, mo - 1, day));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== day) return null;
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
