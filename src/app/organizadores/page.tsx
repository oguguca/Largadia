import type { Metadata } from "next";
import { RaceForm } from "./race-form";

export const metadata: Metadata = {
  title: "Cadastre sua corrida",
  description: "Organizadores podem cadastrar corridas de rua gratuitamente na agenda do Largadia.",
};

export default function OrganizadoresPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-3xl font-extrabold italic uppercase">Cadastre sua corrida</h1>
      <p className="mt-1 mb-6 text-asfalto-500">
        É grátis. Toda prova enviada passa por revisão antes de aparecer na agenda.
      </p>
      <RaceForm />
    </div>
  );
}
