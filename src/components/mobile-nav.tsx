import Link from "next/link";

const items = [
  { href: "/", label: "Início", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/busca", label: "Buscar", icon: "M11 4a7 7 0 105.3 11.6L21 20M11 4a7 7 0 017 7" },
  { href: "/calendario", label: "Calendário", icon: "M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" },
  { href: "/assinatura", label: "Premium", icon: "M12 8v13M4 12h16M5 8h14v4H5zM12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z" },
];

/** Barra inferior fixa no celular, onde está a maioria dos acessos. */
export function MobileNav() {
  return (
    <nav
      aria-label="Navegação rápida"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-asfalto-100 bg-white md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-asfalto-500 hover:text-largada-600"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={i.icon} />
              </svg>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
