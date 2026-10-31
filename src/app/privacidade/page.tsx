import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 leading-relaxed">
      <h1 className="font-display text-3xl font-extrabold italic uppercase">Política de privacidade</h1>
      <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
        Rascunho. O texto definitivo deve ser revisado por um advogado antes do lançamento.
      </p>
      <p>
        Tratamos seus dados conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Usamos sua localização apenas no seu
        navegador, quando você pede para ver provas perto de você, e não a armazenamos.
      </p>
    </div>
  );
}
