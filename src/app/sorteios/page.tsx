import { redirect } from "next/navigation";

/** Os sorteios agora ficam na Área Premium; o endereço antigo continua funcionando. */
export default function SorteiosPage() {
  redirect("/assinatura");
}
