import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";
import { signOut } from "@/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Painel", icon: "M4 13h6V4H4zm10 7h6V4h-6zM4 20h6v-4H4z" },
  { href: "/admin/corridas?status=PENDENTE", label: "Pendentes", icon: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/corridas", label: "Corridas", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/admin/corridas/nova", label: "Nova corrida", icon: "M12 5v14M5 12h14" },
  { href: "/admin/corridas/importar", label: "Importar em lote", icon: "M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" },
  { href: "/admin/pontos", label: "Pontos", icon: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" },
  { href: "/admin/assinantes", label: "Assinantes", icon: "M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a3 3 0 100-6 3 3 0 000 6zM22 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8" },
  { href: "/admin/sorteios", label: "Sorteios", icon: "M12 8v13M4 12h16M5 8h14v4H5zM12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <div className="rounded-2xl bg-asfalto-950 p-3 text-white md:sticky md:top-20">
          <p className="px-2 pt-1 pb-3 font-display text-xl font-extrabold italic uppercase">
            Admin <span className="text-largada-500">·</span>
          </p>
          <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-asfalto-300 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={n.icon} />
                </svg>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 hidden space-y-1 border-t border-white/10 pt-3 md:block">
            <Link href="/" className="block rounded-lg px-2.5 py-2 text-sm text-asfalto-300 hover:bg-white/10 hover:text-white">
              ← Ver o site
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-asfalto-300 hover:bg-white/10 hover:text-white">Sair</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Suspense fallback={<p className="text-asfalto-500">Carregando…</p>}>
          <Guard>{children}</Guard>
        </Suspense>
      </main>
    </div>
  );
}

/** Toda página do admin passa por aqui; as actions também chamam requireAdmin por conta própria. */
async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
