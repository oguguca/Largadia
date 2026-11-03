import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./logo";
import { AdminLink } from "./admin-link";
import { NavLinks, NavLinksFallback } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-asfalto-800 bg-asfalto-950/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo light />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
          <Suspense>
            <AdminLink className="rounded-full bg-pace-500 px-3 py-1 text-sm font-semibold text-asfalto-950 transition hover:bg-pace-600" />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Suspense>
            <AdminLink className="rounded-full bg-pace-500 px-3 py-1.5 text-sm font-semibold text-asfalto-950" />
          </Suspense>
          <Link
            href="/busca"
            className="rounded-full bg-largada-500 px-4 py-1.5 text-sm font-semibold text-asfalto-950 transition hover:bg-pace-500"
          >
            Buscar
          </Link>
        </div>
      </div>
    </header>
  );
}
