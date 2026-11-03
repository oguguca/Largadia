import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials exige sessão JWT. O papel vai no token e é reconferido no banco nas ações de admin.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/entrar" },
  // Vercel e o servidor local definem o host corretamente; sem isso, `next start` recusa a requisição
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        // O limite fica aqui, e não só na tela de login: /api/auth/callback/credentials também chama authorize
        const ip = await clientIp();
        const [byIp, byEmail] = await Promise.all([
          rateLimit(`auth:ip:${ip}`, 20, 900),
          rateLimit(`auth:email:${parsed.data.email}`, 10, 900),
        ]);
        if (!byIp || !byEmail) return null;
        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = (token.role as Role) ?? "USER";
      return session;
    },
  },
});
