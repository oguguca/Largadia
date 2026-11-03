import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "./db";

/**
 * Sessão do visitante. O auth() usa crypto.getRandomValues antes de ler o cookie, e o Next
 * recusa isso no pré-render; o connection() marca o trecho como dinâmico antes.
 */
export async function currentSession() {
  await connection();
  return auth();
}

/** Garante que há alguém logado; senão manda para o login e volta para `voltar` depois. */
export async function requireUser(voltar: string) {
  const session = await currentSession();
  if (!session?.user?.id) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  return user;
}

/**
 * Garante que quem chama é admin. Reconfere o papel no banco para que um
 * rebaixamento valha na hora, sem esperar o token expirar.
 */
export async function requireAdmin() {
  const session = await currentSession();
  if (!session?.user?.id) redirect("/entrar?voltar=/admin");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true } });
  if (user?.role !== "ADMIN") redirect("/");
  return user;
}
