import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function EntrarPage(props: PageProps<"/entrar">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 font-display text-3xl font-extrabold italic uppercase">Entrar</h1>
      <Suspense fallback={<LoginForm />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
      <p className="mt-4 text-center text-sm text-asfalto-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-largada-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { voltar } = await searchParams;
  return <LoginForm voltar={typeof voltar === "string" ? voltar : undefined} />;
}
