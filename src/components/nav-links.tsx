"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Seções do menu e os caminhos que contam como "estar" nelas. */
const links = [
  { href: "/busca", label: "Corridas", match: ["/busca", "/corrida/", "/corridas/"] },
  { href: "/calendario", label: "Calendário", match: ["/calendario"] },
  { href: "/assinatura", label: "Premium", match: ["/assinatura", "/sorteios"] },
  { href: "/conta", label: "Minha conta", match: ["/conta", "/entrar", "/cadastro"] },
];

/** Menu com a seção atual marcada. Fica dentro de Suspense: o caminho só existe na hora do acesso. */
export function NavLinks() {
  return <Links pathname={usePathname()} />;
}

/** Mesmo menu sem marcação, mostrado enquanto o caminho não está disponível. */
export function NavLinksFallback() {
  return <Links pathname={null} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return links.map((l) => {
    const active = !!pathname && l.match.some((m) => pathname === m || pathname.startsWith(m.endsWith("/") ? m : `${m}/`));
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-14 items-center text-sm font-medium transition ${
          active ? "text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-largada-500" : "text-asfalto-300 hover:text-white"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}
