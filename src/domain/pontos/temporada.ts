import { temporada } from "@/config/pontos";

const BRT_MS = 3 * 3600_000;
const DAY_MS = 86_400_000;

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type Season = {
  /** Ex.: "2026-4" (ano e número da temporada no ano) */
  id: string;
  /** Ex.: "out–dez 2026" */
  label: string;
  /** Início (00h de Brasília do primeiro dia) */
  start: Date;
  /** Fim, exclusivo (00h de Brasília do dia seguinte ao último) */
  end: Date;
  /** Até quando aceita comprovações das provas desta temporada */
  closesAt: Date;
};

const FIRST_START = new Date(`${temporada.primeira}T03:00:00Z`);

/**
 * Temporada (de `temporada.meses` meses, alinhada ao calendário) que contém a data, em horário de Brasília.
 * Antes da primeira temporada não há ranking: essas provas contam na primeira, que então começa no zero.
 */
export function seasonOf(date: Date): Season {
  if (date.getTime() < FIRST_START.getTime()) return { ...seasonOf(FIRST_START), start: new Date(0) };
  const brt = new Date(date.getTime() - BRT_MS);
  const year = brt.getUTCFullYear();
  const index = Math.floor(brt.getUTCMonth() / temporada.meses);
  const firstMonth = index * temporada.meses;
  const lastMonth = firstMonth + temporada.meses - 1;
  const calendarStart = new Date(Date.UTC(year, firstMonth, 1) + BRT_MS);
  // A primeira temporada também recebe as provas de antes dela
  const start = calendarStart.getTime() <= FIRST_START.getTime() ? new Date(0) : calendarStart;
  const end = new Date(Date.UTC(year, firstMonth + temporada.meses, 1) + BRT_MS);
  return {
    id: `${year}-${index + 1}`,
    label: `${MONTHS_SHORT[firstMonth]}–${MONTHS_SHORT[lastMonth]} ${year}`,
    start,
    end,
    closesAt: new Date(end.getTime() + temporada.diasParaFechar * DAY_MS),
  };
}

/** Temporada imediatamente anterior, ou null na primeira. */
export function previousSeason(season: Season): Season | null {
  if (season.start.getTime() === 0) return null;
  return seasonOf(new Date(season.start.getTime() - DAY_MS));
}

/** Dias inteiros que faltam para a temporada terminar (0 no último dia). */
export function daysLeft(season: Season, now: Date): number {
  return Math.max(0, Math.ceil((season.end.getTime() - now.getTime()) / DAY_MS) - 1);
}

/** Último dia da temporada, para exibir ("31/12"). */
export function lastDay(season: Season): Date {
  return new Date(season.end.getTime() - DAY_MS);
}

type Total = { userId: string; points: number; races: number; km: number };

/**
 * Ordena pelo total de pontos; no empate, fica na frente quem correu mais km.
 * Quem empata nos dois divide a posição (1, 2, 2, 4).
 */
export function rankTotals<T extends Total>(totals: T[]): (T & { position: number })[] {
  // Km somado do banco vem em ponto flutuante (10,1 + 21,1 ≠ 31,2): compara em centésimos
  const km = (t: Total) => Math.round(t.km * 100);
  const sorted = [...totals].sort((a, b) => b.points - a.points || km(b) - km(a));
  let position = 0;
  return sorted.map((t, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.points !== t.points || km(prev) !== km(t)) position = i + 1;
    return { ...t, position };
  });
}
