import { NextResponse } from "next/server";
import { monthPath } from "@/lib/months";

/** Redireciona para o mês corrente (horário de Brasília). */
export function GET(request: Request) {
  const now = new Date(Date.now() - 3 * 3600_000);
  return NextResponse.redirect(new URL(monthPath(now.getUTCFullYear(), now.getUTCMonth() + 1), request.url), 307);
}
