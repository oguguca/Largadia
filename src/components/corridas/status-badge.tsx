import type { RegistrationStatus } from "@/generated/prisma/enums";
import { registrationStatusLabels } from "@/config/corridas";

const styles: Record<RegistrationStatus, string> = {
  ABERTAS: "bg-pace-500 text-asfalto-950",
  EM_BREVE: "bg-largada-100 text-largada-700",
  ESGOTADAS: "bg-asfalto-100 text-asfalto-700",
  ENCERRADAS: "bg-asfalto-100 text-asfalto-500",
};

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {registrationStatusLabels[status]}
    </span>
  );
}

export function PastBadge() {
  return (
    <span className="inline-block rounded-full bg-asfalto-700 px-2.5 py-0.5 text-xs font-semibold text-white">Realizada</span>
  );
}
