import Link from "next/link";
import { Logo } from "./logo";

const links = [
  { href: "/busca", label: "Corridas" },
  { href: "/calendario", label: "Calendário" },
  { href: "/mapa", label: "Mapa" },
  { href: "/sorteios", label: "Sorteios" },
  { href: "/organizadores", label: "Cadastrar corrida" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-asfalto-800 bg-asfalto-950/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo light />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-asfalto-300 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/busca"
          className="rounded-full bg-largada-500 px-4 py-1.5 text-sm font-semibold text-asfalto-950 transition hover:bg-pace-500 md:hidden"
        >
          Buscar
        </Link>
      </div>
    </header>
  );
}
