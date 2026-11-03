"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres").max(200),
});

export type SignupState = { errors?: Record<string, string[]>; values?: { name: string; email: string } } | null;

export async function signup(_prev: SignupState, form: FormData): Promise<SignupState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  const ip = await clientIp();
  if (!(await rateLimit(`cadastro:${ip}`, 5, 3600))) {
    return { errors: { form: ["Muitos cadastros a partir desta rede. Tente de novo mais tarde."] }, values };
  }
  const parsed = signupSchema.safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (errors[String(issue.path[0])] ??= []).push(issue.message);
    return { errors, values };
  }
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { errors: { email: ["Já existe uma conta com este e-mail. Entre com sua senha."] }, values };
  }
  await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  // signIn lança o redirect de sucesso
  await signIn("credentials", { email, password, redirectTo: "/conta" });
  return null;
}
