"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { logApprovedClaim } from "@/domain/biblioteca/salvar";

const idSchema = z.string().cuid();

/** Decisões mexem no saldo e no ranking: atualiza as telas que mostram pontos. */
function refreshPoints() {
  revalidatePath("/admin/pontos");
  revalidatePath("/admin");
  revalidatePath("/assinatura");
  revalidatePath("/conta");
  revalidatePath("/");
}

export async function approveClaim(id: string) {
  await requireAdmin();
  await db.pointClaim.updateMany({
    where: { id: idSchema.parse(id), status: "PENDENTE" },
    data: { status: "APROVADA", reviewNote: null, reviewedAt: new Date() },
  });
  // Corrida aprovada vai para a estante de quem correu
  await logApprovedClaim(id);
  revalidatePath("/minhas-corridas");
  refreshPoints();
}

export async function rejectClaim(id: string, form: FormData) {
  await requireAdmin();
  const note = z.string().trim().max(300).parse(form.get("note") ?? "");
  await db.pointClaim.updateMany({
    where: { id: idSchema.parse(id), status: "PENDENTE" },
    data: { status: "RECUSADA", reviewNote: note || null, reviewedAt: new Date() },
  });
  refreshPoints();
}

/** Desfaz uma decisão (volta para análise), caso tenha aprovado ou recusado por engano. */
export async function reopenClaim(id: string) {
  await requireAdmin();
  await db.pointClaim.update({ where: { id: idSchema.parse(id) }, data: { status: "PENDENTE", reviewNote: null, reviewedAt: null } });
  refreshPoints();
}
