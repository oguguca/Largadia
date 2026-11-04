import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isPremium, PIX_STATUS, statusLabels } from "@/domain/assinatura/status";
import { cooldownDaysLeft, cooldownUntil } from "@/domain/sorteios/sorteio";
import { sorteios } from "@/config/sorteios";

type PlanStatus = "ATIVO" | "VENCE_LOGO" | "VENCIDO";

const planLabels: Record<PlanStatus, string> = { ATIVO: "Ativo", VENCE_LOGO: "Vence em breve", VENCIDO: "Vencido" };
const planStyle: Record<PlanStatus, string> = {
  ATIVO: "bg-emerald-100 text-emerald-800",
  VENCE_LOGO: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-red-100 text-red-700",
};

/** Pix que acaba em até 7 dias (ou cartão com pagamento atrasado) aparece como "vence em breve". */
const SOON_DAYS = 7;

const tabs = ["todos", "ativos", "vencidos", "carencia"] as const;
const tabSchema = z.enum(tabs).catch("todos");
const tabLabels: Record<(typeof tabs)[number], string> = {
  todos: "Todos",
  ativos: "Ativos",
  vencidos: "Vencidos",
  carencia: "Em carência de sorteio",
};

const dateOnly = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Assinantes Premium (atuais e antigos): plano, validade e se podem participar de sorteios agora. */
export default async function AdminAssinantesPage(props: PageProps<"/admin/assinantes">) {
  await requireAdmin();
  await connection();
  const tab = tabSchema.parse((await props.searchParams).f);
  const now = new Date();

  const users = await db.user.findMany({
    where: { subscriptionStatus: { not: null } },
    orderBy: { subscriptionEndsAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      createdAt: true,
      rafflesWon: { where: { drawnAt: { not: null } }, orderBy: { drawnAt: "desc" }, take: 1, select: { prize: true, drawnAt: true } },
    },
  });

  const rows = users.map((u) => {
    const active = isPremium(u, now);
    const soon =
      active &&
      (u.subscriptionStatus === "past_due" ||
        (u.subscriptionStatus === PIX_STATUS &&
          !!u.subscriptionEndsAt &&
          u.subscriptionEndsAt.getTime() - now.getTime() < SOON_DAYS * 86_400_000));
    const plan: PlanStatus = !active ? "VENCIDO" : soon ? "VENCE_LOGO" : "ATIVO";
    const lastWin = u.rafflesWon[0] ?? null;
    const waitDays = cooldownDaysLeft(lastWin?.drawnAt ?? null, now);
    return { ...u, plan, lastWin, waitDays };
  });

  const counts = {
    todos: rows.length,
    ativos: rows.filter((r) => r.plan !== "VENCIDO").length,
    vencidos: rows.filter((r) => r.plan === "VENCIDO").length,
    carencia: rows.filter((r) => r.waitDays > 0).length,
  };
  const shown = rows.filter((r) =>
    tab === "ativos" ? r.plan !== "VENCIDO" : tab === "vencidos" ? r.plan === "VENCIDO" : tab === "carencia" ? r.waitDays > 0 : true,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold italic uppercase">Assinantes</h1>
        <p className="text-sm text-asfalto-500">
          Quem assinou o Premium, a situação do plano e se pode participar de sorteios. Quem ganha um sorteio fica{" "}
          {sorteios.carenciaGanhadorDias} dias sem poder participar de outro.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Assinantes ativos", counts.ativos, "text-emerald-700"],
            ["Vencem em breve", rows.filter((r) => r.plan === "VENCE_LOGO").length, "text-amber-700"],
            ["Vencidos", counts.vencidos, "text-red-700"],
            ["Em carência", counts.carencia, "text-asfalto-950"],
          ] as const
        ).map(([label, value, color]) => (
          <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-asfalto-100">
            <dt className="text-xs text-asfalto-500">{label}</dt>
            <dd className={`font-display text-3xl font-extrabold tabular-nums ${color}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === "todos" ? "/admin/assinantes" : `/admin/assinantes?f=${t}`}
            className={`rounded-full px-3 py-1 text-sm ${t === tab ? "bg-asfalto-950 text-white" : "ring-1 ring-asfalto-300"}`}
          >
            {tabLabels[t]} ({counts[t]})
          </Link>
        ))}
      </div>

      {shown.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-asfalto-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-asfalto-100 text-asfalto-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Assinante</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plano</th>
                <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                <th scope="col" className="px-4 py-3 font-semibold">Válido até</th>
                <th scope="col" className="px-4 py-3 font-semibold">Sorteios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-asfalto-100">
              {shown.map((r) => (
                <tr key={r.id} className="align-top">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-xs text-asfalto-500">{r.email}</span>
                  </th>
                  <td className="px-4 py-3">
                    {r.subscriptionStatus === PIX_STATUS ? "Pix pré-pago" : "Cartão"}
                    {r.subscriptionStatus !== PIX_STATUS && (
                      <span className="block text-xs text-asfalto-500">{statusLabels[r.subscriptionStatus ?? ""] ?? r.subscriptionStatus}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${planStyle[r.plan]}`}>{planLabels[r.plan]}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.subscriptionEndsAt ? dateOnly(r.subscriptionEndsAt) : "—"}
                    {r.subscriptionStatus !== PIX_STATUS && r.plan !== "VENCIDO" && (
                      <span className="block text-xs text-asfalto-500">renova sozinho</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.waitDays > 0 && r.lastWin ? (
                      <>
                        <span className="font-semibold text-amber-800">
                          ⏳ Volta a participar em {r.waitDays} {r.waitDays === 1 ? "dia" : "dias"}
                        </span>
                        <span className="block text-xs text-asfalto-500">
                          Ganhou {r.lastWin.prize} em {dateOnly(r.lastWin.drawnAt!)}; libera em {dateOnly(cooldownUntil(r.lastWin.drawnAt)!)}
                        </span>
                      </>
                    ) : r.plan === "VENCIDO" ? (
                      <span className="text-asfalto-500">Precisa renovar para participar</span>
                    ) : (
                      <span className="text-emerald-700">Pode participar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-asfalto-500 ring-1 ring-asfalto-100">Ninguém nesta lista.</p>
      )}
    </div>
  );
}
