import { connection } from "next/server";
import { requireAdmin } from "@/lib/session";
import { saveRaffle } from "../actions";
import { RaffleForm } from "../raffle-form";
import { raceOptions } from "../races";

export default async function NovoSorteioPage() {
  await requireAdmin();
  await connection();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold italic uppercase">Novo sorteio</h1>
      <RaffleForm action={saveRaffle.bind(null, null)} initial={{ premiumOnly: "on" }} races={await raceOptions()} submitLabel="Criar sorteio" />
    </div>
  );
}
