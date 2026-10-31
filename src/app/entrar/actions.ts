"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Só aceita caminhos internos, para não virar redirecionamento aberto. */
function safeRedirect(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 10, 900))) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: safeRedirect(form.get("voltar")),
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) return "E-mail ou senha incorretos.";
    throw error; // o redirect de sucesso é lançado como exceção e precisa seguir adiante
  }
}
