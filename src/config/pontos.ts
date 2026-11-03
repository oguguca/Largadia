/** Regras de pontuação. Mudanças aqui valem para comprovações novas; as já enviadas guardam os pontos calculados. */
export const pontos = {
  /** Pontos fixos por prova concluída */
  porProva: 5,
  /** Pontos por km corrido (arredondado) */
  porKm: 1,
  /** Prazo para enviar a comprovação depois da largada */
  diasParaEnviar: 60,
  /** Dias para trás que a lista "Registrar corrida" mostra, além de hoje; as mais antigas entram por "Minha prova não está na lista" */
  diasNaLista: 7,
} as const;

/** Ranking por temporada. Com `premio` preenchido, quem termina em 1º leva o prêmio. */
export const temporada = {
  /** Duração de cada temporada, em meses (temporadas fixas: jan–mar, abr–jun, jul–set, out–dez) */
  meses: 3,
  /**
   * Prêmio do 1º colocado da temporada, como entra na frase ("um tênis de corrida").
   * Vazio = temporada sem prêmio: o site não fala em prêmio do ranking em lugar nenhum.
   */
  premio: "" as string,
  /** Foto do prêmio em PNG com fundo transparente (em public/). Vazio mostra a ilustração de tênis */
  premioImagem: "",
  /** Prêmios fixos mostrados em "Prêmios em jogo", além dos sorteios abertos cadastrados no admin */
  premiosFixos: [{ titulo: "Inscrição grátis", detalhe: "em uma corrida definida pelo Largadia" }],
  /** Começo da primeira temporada (aaaa-mm-dd); provas anteriores a ela contam na primeira */
  primeira: "2026-10-01",
  /** Dias depois do fim da temporada para enviar as últimas comprovações; depois disso o resultado fecha */
  diasParaFechar: 7,
} as const;
