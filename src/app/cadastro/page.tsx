import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function CadastroPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-extrabold italic uppercase">Criar conta</h1>
      <p className="mb-6 text-sm text-asfalto-500">Crie sua conta para assinar o Largadia Premium e acumular pontos.</p>
      <SignupForm />
      <p className="mt-4 text-center text-sm text-asfalto-500">
        Já tem conta?{" "}
        <Link href="/entrar?voltar=/conta" className="font-semibold text-largada-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
