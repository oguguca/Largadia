import type { Metadata } from "next";
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
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { voltar } = await searchParams;
  return <LoginForm voltar={typeof voltar === "string" ? voltar : undefined} />;
}
