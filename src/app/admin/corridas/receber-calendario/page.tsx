import { requireAdmin } from "@/lib/session";
import { ReceiveCalendar } from "./receive-calendar";

// Provas de cidades novas consultam o geocode com 1 s de pausa entre elas
export const maxDuration = 120;

/** Aberta pelo favorito "Enviar calendário ao Largadia": confere e grava as provas do calendário. */
export default async function ReceberCalendarioPage() {
  await requireAdmin();
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 font-display text-2xl font-extrabold italic uppercase">Calendário recebido</h1>
      <ReceiveCalendar />
    </div>
  );
}
