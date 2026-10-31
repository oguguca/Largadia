/**
 * Flags globais do produto. Altere aqui para ligar/desligar funcionalidades.
 */
export const flags = {
  /**
   * Sorteios ligados a assinatura exigem autorização prévia da Secretaria de
   * Prêmios e Apostas (SPA/MF). Mantenha desligado até a autorização sair.
   * Enquanto false, a aba de sorteios mostra "Em breve".
   */
  sorteiosAtivos: false,

  /** Se true, só assinantes Largadia+ ativos acumulam pontos e entram em sorteios. */
  pontosSomenteAssinantes: true,
} as const;
