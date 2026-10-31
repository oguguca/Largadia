import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

/**
 * Garante que quem chama é admin. Reconfere o papel no banco para que um
 * rebaixamento valha na hora, sem esperar o token expirar.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar?voltar=/admin");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true } });
  if (user?.role !== "ADMIN") redirect("/");
  return user;
}
