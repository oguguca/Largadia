/**
 * Parâmetros adicionados ao link de inscrição de cada plataforma, para que ela
 * saiba quantos inscritos vieram do Largadia. Quando uma parceria for fechada,
 * troque pelos parâmetros combinados (ex.: código de afiliado).
 *
 * A chave é o domínio sem "www."; subdomínios também casam.
 */
export const partnerParams: Record<string, Record<string, string>> = {
  "ticketsports.com.br": { origem: "largadia", campanha: "largadia" },
  "sympla.com.br": { utm_source: "largadia", utm_medium: "referral" },
  "minhasinscricoes.com.br": { utm_source: "largadia", utm_medium: "referral" },
  "ativo.com": { utm_source: "largadia", utm_medium: "referral" },
  "movnow.com.br": { origem: "largadia", campanha: "largadia" },
};

/** Usado para qualquer outro domínio (site do organizador etc.). */
export const defaultParams: Record<string, string> = { utm_source: "largadia", utm_medium: "referral" };

/** Nome amigável das plataformas conhecidas, exibido no botão de inscrição. */
export const platformNames: Record<string, string> = {
  "ticketsports.com.br": "Ticket Sports",
  "sympla.com.br": "Sympla",
  "minhasinscricoes.com.br": "Minhas Inscrições",
  "ativo.com": "Ativo",
  "movnow.com.br": "MovNow",
};
