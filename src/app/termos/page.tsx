import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 leading-relaxed">
      <h1 className="font-display text-3xl font-extrabold italic uppercase">Termos de uso</h1>
      <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
        Rascunho. O texto definitivo deve ser revisado por um advogado antes do lançamento.
      </p>
      <p>
        O Largadia é uma agenda de corridas de rua. As informações das provas são fornecidas pelos organizadores e podem mudar
        sem aviso. A inscrição é feita diretamente no site oficial de cada prova; o Largadia não vende inscrições.
      </p>
    </div>
  );
}
