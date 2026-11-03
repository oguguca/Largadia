import { temporada } from "@/config/pontos";
import { daysLeft, lastDay, type Season } from "@/domain/pontos/temporada";
import type { RankingRow } from "@/domain/pontos/ranking";

const dayMonth = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/** Temporada em andamento: prêmio do 1º lugar, quando termina e quem venceu a anterior. */
export function SeasonBanner({ season, now, champion }: { season: Season; now: Date; champion: RankingRow | null }) {
  const left = daysLeft(season, now);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-asfalto-950 px-5 py-4 text-white">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          👟
        </span>
        <div>
          <p className="font-display text-xl font-bold uppercase">
            Temporada {season.label}
            {temporada.premio && `: o 1º lugar ganha ${temporada.premio}`}
          </p>
          <p className="text-sm text-asfalto-300">
            Termina em {dayMonth.format(lastDay(season))} ({left === 0 ? "último dia" : `faltam ${left} ${left === 1 ? "dia" : "dias"}`}). No
            empate, vence quem correu mais km.
          </p>
        </div>
      </div>
      {champion && (
        <p className="text-sm text-asfalto-300 md:ml-auto">
          Campeão da temporada anterior: <strong className="text-amber-400">👑 {champion.name}</strong> ({champion.points} pontos)
        </p>
      )}
    </div>
  );
}
