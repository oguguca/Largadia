import Link from "next/link";
import { currentSession } from "@/lib/session";

/**
 * Atalho para o painel, só para quem é admin. Esconder o link é conveniência:
 * a proteção de verdade é o requireAdmin em todas as páginas e actions do /admin.
 */
export async function AdminLink({ className }: { className?: string }) {
  const session = await currentSession();
  if (session?.user?.role !== "ADMIN") return null;
  return (
    <Link href="/admin" className={className}>
      Painel de admin
    </Link>
  );
}
