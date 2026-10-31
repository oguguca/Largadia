import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";
import { signOut } from "@/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/corridas?status=PENDENTE", label: "Pendentes" },
  { href: "/admin/corridas", label: "Corridas" },
  { href: "/admin/corridas/nova", label: "+ Nova corrida" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-asfalto-100 pb-3">
        <span className="mr-2 font-display text-xl font-extrabold italic uppercase">Admin</span>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full px-3 py-1 text-sm font-medium ring-1 ring-asfalto-300 hover:bg-white">
            {n.label}
          </Link>
        ))}
        <form
          className="ml-auto"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-sm text-asfalto-500 hover:text-asfalto-900">Sair</button>
        </form>
      </div>
      <Suspense fallback={<p className="text-asfalto-500">Carregando…</p>}>
        <Guard>{children}</Guard>
      </Suspense>
    </div>
  );
}

/** Toda página do admin passa por aqui; as actions também chamam requireAdmin por conta própria. */
async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
