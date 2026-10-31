import type { Metadata } from "next";
import Link from "next/link";
import { flags } from "@/config/flags";

export const metadata: Metadata = { title: "Sorteios do Clube Largadia" };

export default function SorteiosPage() {
  if (!flags.sorteiosAtivos) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="inline-block rounded-full bg-largada-100 px-3 py-1 text-sm font-semibold text-largada-700">Em breve</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold italic uppercase">Sorteios do Clube Largadia</h1>
        <p className="mt-2 text-asfalto-500">
          Em breve, assinantes Largadia+ vão poder trocar pontos por números da sorte e concorrer a inscrições gratuitas.
        </p>
        <Link href="/busca" className="mt-6 inline-block rounded-full bg-largada-500 px-6 py-3 font-semibold text-asfalto-950">
          Enquanto isso, encontre sua próxima corrida
        </Link>
      </div>
    );
  }
  // Implementado na fase 6.
  return null;
}
