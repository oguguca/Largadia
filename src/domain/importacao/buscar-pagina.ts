import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2_000_000;

/** Bloqueia endereços internos para o servidor não ser usado para acessar a rede privada (SSRF). */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) {
      const rest = v.slice(7);
      // Forma hexadecimal (::ffff:7f00:1) do IPv4 mapeado: converte para 127.0.0.1
      const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
      if (hex) {
        const [hi, lo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
        return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
      }
      return isPrivateAddress(rest);
    }
    return (
      v === "::1" ||
      v === "::" ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("fe80") ||
      v.startsWith("ff") || // multicast
      v.startsWith("64:ff9b:") // NAT64, aponta para IPv4 de qualquer lugar
    );
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast e reservados
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

/** Lê o corpo até `max` bytes e para o download ali, sem carregar o resto na memória. */
async function readCapped(res: Response, max: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { bytes: new Uint8Array(), truncated: false };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      break;
    }
  }
  const bytes = new Uint8Array(Math.min(size, max));
  let offset = 0;
  for (const c of chunks) {
    const part = c.subarray(0, Math.max(0, bytes.length - offset));
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return { bytes, truncated: size > max };
}

/** Baixa o HTML de uma página pública. */
export async function fetchPublicPage(raw: string): Promise<{ html: string; finalUrl: string }> {
  const { res, finalUrl } = await fetchPublic(raw, "text/html", Infinity);
  if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("O link não é uma página HTML.");
  // Páginas maiores são cortadas: o começo basta para achar data, local e distâncias
  const { bytes } = await readCapped(res, MAX_BYTES);
  return { html: new TextDecoder().decode(bytes), finalUrl: finalUrl.toString() };
}

const MAX_PDF_BYTES = 10_000_000;

/** Baixa um PDF público (ex.: regulamento da prova) e devolve os bytes. */
export async function fetchPublicPdf(raw: string): Promise<Uint8Array> {
  const { res } = await fetchPublic(raw, "application/pdf", MAX_PDF_BYTES);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("pdf") && !type.includes("octet-stream")) throw new Error("O link não é um PDF.");
  const { bytes, truncated } = await readCapped(res, MAX_PDF_BYTES);
  if (truncated) throw new Error("Arquivo grande demais.");
  return bytes;
}
