import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2_000_000;

/** Bloqueia endereços internos para o servidor não ser usado para acessar a rede privada (SSRF). */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use um link http(s).");
  if (url.username || url.password) throw new Error("Link inválido.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Endereço não permitido.");
  }
  return url;
}

/** Baixa um arquivo público, seguindo até 3 redirecionamentos e checando cada destino. */
async function fetchPublic(raw: string, accept: string, maxBytes: number): Promise<{ res: Response; finalUrl: URL }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Largadia/1.0 (cadastro de corridas)", Accept: accept },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`A página respondeu com status ${res.status}.`);
    if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw new Error("Arquivo grande demais.");
    return { res, finalUrl: url };
  }
  throw new Error("Muitos redirecionamentos.");
}

/** Baixa o HTML de uma página pública. */
export async function fetchPublicPage(raw: string): Promise<{ html: string; finalUrl: string }> {
  const { res, finalUrl } = await fetchPublic(raw, "text/html", Infinity);
  if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("O link não é uma página HTML.");
  const buf = await res.arrayBuffer();
  return { html: new TextDecoder().decode(buf.slice(0, MAX_BYTES)), finalUrl: finalUrl.toString() };
}

const MAX_PDF_BYTES = 10_000_000;

/** Baixa um PDF público (ex.: regulamento da prova) e devolve os bytes. */
export async function fetchPublicPdf(raw: string): Promise<Uint8Array> {
  const { res } = await fetchPublic(raw, "application/pdf", MAX_PDF_BYTES);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("pdf") && !type.includes("octet-stream")) throw new Error("O link não é um PDF.");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_PDF_BYTES) throw new Error("Arquivo grande demais.");
  return new Uint8Array(buf);
}
