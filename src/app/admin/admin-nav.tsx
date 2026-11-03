"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; icon: string };

const ICONS = {
  painel: "M4 13h6V4H4zm10 7h6V4h-6zM4 20h6v-4H4z",
  corridas: "M4 6h16M4 12h16M4 18h10",
  todas: "M4 6h16M4 12h16M4 18h10",
  pendentes: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  nova: "M12 5v14M5 12h14",
  importar: "M12 4v11m0 0l-4-4m4 4l4-4M5 20h14",
  pontos: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  assinantes: "M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a3 3 0 100-6 3 3 0 000 6zM22 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8",
  sorteios: "M12 8v13M4 12h16M5 8h14v4H5zM12 8c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z",
};

/** Tudo de corridas num grupo só: lista, pendentes, cadastro e importação. */
const RACES: Item[] = [
  { href: "/admin/corridas", label: "Todas as corridas", icon: ICONS.todas },
  { href: "/admin/corridas?status=PENDENTE", label: "Pendentes", icon: ICONS.pendentes },
  { href: "/admin/corridas/nova", label: "Nova corrida", icon: ICONS.nova },
  { href: "/admin/corridas/importar", label: "Importar em lote", icon: ICONS.importar },
];

const AFTER: Item[] = [
  { href: "/admin/pontos", label: "Pontos", icon: ICONS.pontos },
  { href: "/admin/assinantes", label: "Assinantes", icon: ICONS.assinantes },
  { href: "/admin/sorteios", label: "Sorteios", icon: ICONS.sorteios },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const base = "flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition";
const idle = "text-asfalto-300 hover:bg-white/10 hover:text-white";
const on = "bg-white/10 text-white";

/** Menu do admin com a página atual marcada. Dentro de Suspense (usa o endereço da página). */
export function AdminNav() {
  return <Nav pathname={usePathname()} pending={useSearchParams().get("status") === "PENDENTE"} />;
}

/** Mesmo menu sem marcação, enquanto o endereço não está disponível. */
export function AdminNavFallback() {
  return <Nav pathname={null} pending={false} />;
}

function Nav({ pathname, pending }: { pathname: string | null; pending: boolean }) {
  const inRaces = !!pathname?.startsWith("/admin/corridas");
  const [open, setOpen] = useState(inRaces);
  // Ao entrar numa página de corridas o grupo abre; o admin ainda pode fechar na mão
  const expanded = open || inRaces;

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/admin/corridas?status=PENDENTE") return pathname === "/admin/corridas" && pending;
    if (href === "/admin/corridas") return pathname === "/admin/corridas" && !pending;
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const link = (n: Item) => (
    <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={`${base} ${isActive(n.href) ? on : idle}`}>
      <Icon d={n.icon} />
      {n.label}
    </Link>
  );

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
      {link({ href: "/admin", label: "Painel", icon: ICONS.painel })}

      <div className="flex shrink-0 gap-1 md:flex-col">
        <button
          type="button"
          onClick={() => setOpen(!expanded)}
          aria-expanded={expanded}
          aria-controls="admin-corridas"
          className={`${base} w-full justify-between ${inRaces ? "text-white" : idle}`}
        >
          <span className="flex items-center gap-2.5">
            <Icon d={ICONS.corridas} />
            Corridas
          </span>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {expanded && (
          <div id="admin-corridas" className="flex gap-1 md:ml-4 md:flex-col md:border-l md:border-white/10 md:pl-2">
            {RACES.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`${base} relative ${isActive(n.href) ? on : idle}`}
              >
                {/* Marca laranja na subpágina atual */}
                {isActive(n.href) && <span className="absolute top-1.5 bottom-1.5 -left-[9px] hidden w-0.5 rounded-full bg-largada-500 md:block" aria-hidden />}
                <Icon d={n.icon} />
                {n.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {AFTER.map(link)}
    </nav>
  );
}
