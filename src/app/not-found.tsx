import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-display text-7xl font-extrabold italic text-largada-500">404</p>
      <h1 className="mt-2 text-xl font-semibold">Saiu do percurso</h1>
      <p className="mt-1 text-asfalto-500">Não encontramos esta página. Ela pode ter sido removida ou o link está errado.</p>
      <Link href="/busca" className="mt-6 inline-block rounded-full bg-largada-500 px-6 py-3 font-semibold text-asfalto-950">
        Voltar para as corridas
      </Link>
    </div>
  );
}
