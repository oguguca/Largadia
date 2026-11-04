import { z } from "zod";
import { extractDistances, extractRaceDraft, type RaceDraft } from "./extrair";

/**
 * O que o botão "Enviar ao Largadia" (bookmarklet) manda da página aberta no navegador do admin:
 * o <head> com JSON-LD e OpenGraph, e o texto visível já renderizado (modalidades, descrição etc.).
 */
export const renderedPageSchema = z.object({
  url: z.string().url().max(2000),
  head: z.string().max(200_000),
  text: z.string().max(60_000),
  /** Links de PDF da página (regulamento), lidos quando o texto não traz distância ou preço */
  pdfs: z.array(z.string().url().max(2000)).max(5).default([]),
});

export type RenderedPage = z.input<typeof renderedPageSchema>;

/** Linhas com R$ que não são preço de inscrição (premiação, taxas, multas). */
const NOT_PRICE = /pr[eê]mi|lugar|colocad|taxa|cancel|multa|estorno|reembolso|adicional|\b\d+º/i;

/** Faixa de preço citada no texto: "Lote 1 – R$ 129,90". Ignora premiação e taxas. Valores em reais. */
export function extractPrices(text: string, splitOn: RegExp = /\n/): { min: number; max: number } | undefined {
  const values: number[] = [];
  for (const line of text.split(splitOn)) {
    if (!/R\$/.test(line) || NOT_PRICE.test(line)) continue;
    for (const m of line.matchAll(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/g)) {
      const n = Number(m[1].replace(/\./g, "").replace(",", "."));
      if (n > 0 && n <= 3000) values.push(n);
    }
  }
  if (!values.length) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

const DESCRIPTION_START = /^\s*(sobre o evento|sobre a prova|informa[çc][õo]es do evento|informa[çc][õo]es da prova|descri[çc][ãa]o( do evento)?|apresenta[çc][ãa]o)\s*$/im;
const MAX_DESCRIPTION = 4000;

/** Descrição a partir do bloco "Sobre o evento" do texto, cortada num fim de parágrafo. */
export function extractDescription(text: string): string | undefined {
  const start = DESCRIPTION_START.exec(text);
  if (!start) return undefined;
  let body = text.slice(start.index + start[0].length).replace(/\n{3,}/g, "\n\n").trim();
  if (body.length > MAX_DESCRIPTION) {
    const cut = body.lastIndexOf("\n\n", MAX_DESCRIPTION);
    body = body.slice(0, cut > 500 ? cut : MAX_DESCRIPTION).trim();
  }
  return body.length >= 40 ? body : undefined;
}

/** Rascunho completo: dados estruturados do <head> + distâncias, preço e descrição do texto visível. */
export function draftFromRenderedPage(page: RenderedPage): RaceDraft {
  const draft = extractRaceDraft(`${page.head}<main>${page.text.replace(/</g, " ")}</main>`, page.url);
  const distances = extractDistances(page.text);
  if (distances.length) draft.distances = distances;
  const description = extractDescription(page.text);
  if (description) draft.description = description;
  const prices = extractPrices(page.text);
  if (prices) {
    draft.priceMin = prices.min;
    draft.priceMax = prices.max;
  }
  return draft;
}

/**
 * Completa o rascunho com o texto do regulamento (PDF), só nos campos que a página não trouxe.
 * O texto extraído do PDF vem sem quebras de linha confiáveis, então o preço é procurado por frase.
 */
export function addFromRegulation(draft: RaceDraft, pdfText: string): RaceDraft {
  if (!draft.distances?.length) {
    const distances = extractDistances(pdfText);
    if (distances.length) draft.distances = distances;
  }
  if (draft.priceMin === undefined) {
    const prices = extractPrices(pdfText, /(?<=[.;:!?])\s+|\n/);
    if (prices) {
      draft.priceMin = prices.min;
      draft.priceMax = prices.max;
    }
  }
  return draft;
}
