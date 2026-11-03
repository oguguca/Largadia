import type { RaceType, RegistrationStatus } from "@/generated/prisma/enums";

export const raceTypeLabels: Record<RaceType, string> = {
  RUA: "Rua",
  TRAIL: "Trail",
  NOTURNA: "Noturna",
  TEMATICA: "Temática",
  SOLIDARIA: "Solidária",
  KIDS: "Kids",
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  ABERTAS: "Inscrições abertas",
  EM_BREVE: "Inscrições em breve",
  ESGOTADAS: "Esgotadas",
  ENCERRADAS: "Encerradas",
};

/** Faixas usadas no filtro de distância da busca (km, limites inclusivos). */
export const distanceBuckets = {
  "ate-5": { label: "Até 5k", min: 0, max: 5 },
  "6-10": { label: "6 a 10k", min: 5.01, max: 10 },
  "11-21": { label: "11 a 21k", min: 10.01, max: 21.1 },
  "22-42": { label: "22 a 42k", min: 21.11, max: 42.2 },
  ultra: { label: "Ultra (+42k)", min: 42.21, max: Infinity },
} as const;

export type DistanceBucket = keyof typeof distanceBuckets;

export const radiusOptions = [10, 25, 50, 100, 200] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const SEARCH_PAGE_SIZE = 20;
