import { redirect } from "next/navigation";
import { connection } from "next/server";
import { monthPath } from "@/lib/months";

export default async function CalendarioPage() {
  await connection();
  // Mês corrente em horário de Brasília
  const now = new Date(Date.now() - 3 * 3600_000);
  redirect(monthPath(now.getUTCFullYear(), now.getUTCMonth() + 1));
}
