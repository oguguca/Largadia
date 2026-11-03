import { requireAdmin } from "@/lib/session";
import { saveRace } from "../actions";
import { ReceiveAndForm } from "./receive-and-form";

/** Aberta pelo botão "Enviar ao Largadia": recebe a página da prova e pré-preenche o formulário. */
export default async function ReceberCorridaPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 font-display text-2xl font-extrabold italic uppercase">Corrida recebida</h1>
      <ReceiveAndForm save={saveRace.bind(null, null)} />
    </div>
  );
}
