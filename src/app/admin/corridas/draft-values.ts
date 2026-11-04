import type { RaceDraft } from "@/domain/importacao/extrair";
import type { RaceFormValues } from "./race-admin-form";

/** Converte o rascunho importado nos valores iniciais do formulário do admin. */
export function draftToFormValues(d: RaceDraft): RaceFormValues {
  return {
    name: d.name ?? "",
    date: d.date ?? "",
    time: d.time ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    venue: d.venue ?? "",
    distances: d.distances?.join(" ") ?? "",
    type: d.type ?? "",
    priceMin: d.priceMin?.toString() ?? "",
    priceMax: d.priceMax?.toString() ?? "",
    imageUrl: d.imageUrl ?? "",
    description: d.description ?? "",
    organizer: d.organizer ?? "",
    registrationUrl: d.registrationUrl,
    sourceUrl: d.registrationUrl,
  };
}
