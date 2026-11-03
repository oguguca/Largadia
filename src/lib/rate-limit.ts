import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

/** IP do cliente atrás do proxy da Vercel. Os cabeçalhos da própria Vercel vêm antes: o cliente não consegue forjá-los. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconhecido"
  );
}

/**
 * Rate limit por janela fixa, guardado no Postgres. Retorna true se a ação é permitida.
 * Ex.: rateLimit("organizador:1.2.3.4", 5, 3600) = no máximo 5 envios por hora.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(now - (now % (windowSeconds * 1000)));
  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  return bucket.count <= limit;
}
