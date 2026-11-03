import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { fetchPublicPdf } from "./buscar-pagina";

const MAX_PAGES = 30;

/** Texto de um PDF público (regulamento da prova). Lê no máximo as primeiras páginas. */
export async function readPublicPdfText(url: string): Promise<string> {
  const pdf = await getDocumentProxy(await fetchPublicPdf(url));
  if (pdf.numPages > MAX_PAGES) throw new Error("PDF longo demais.");
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
