import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations usam a conexão direta; o pooler do Neon não suporta todas as operações.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
