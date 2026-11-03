import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// As corridas entram pelo painel admin (cadastro rápido ou importação em lote), não pelo seed.
async function main() {
  // Admin inicial: só cria se ainda não existir, para não sobrescrever uma senha trocada
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const exists = await db.user.findUnique({ where: { email } });
    if (!exists) {
      await db.user.create({ data: { email, name: "Admin", role: "ADMIN", passwordHash: await hashPassword(password) } });
      console.log(`Admin criado: ${email}`);
    } else if (exists.role !== "ADMIN") {
      await db.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log(`Usuário promovido a admin: ${email}`);
    }
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum admin criado.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
