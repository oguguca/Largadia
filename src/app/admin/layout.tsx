import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";
import { signOut } from "@/auth";
import { AdminNav, AdminNavFallback } from "./admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <div className="rounded-2xl bg-asfalto-950 p-3 text-white md:sticky md:top-20">
          <p className="px-2 pt-1 pb-3 font-display text-xl font-extrabold italic uppercase">
            Admin <span className="text-largada-500">·</span>
          </p>
          <Suspense fallback={<AdminNavFallback />}>
            <AdminNav />
          </Suspense>
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
