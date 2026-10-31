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

/** Baixa o HTML de uma página pública, seguindo até 3 redirecionamentos e checando cada destino. */
export async function fetchPublicPage(raw: string): Promise<{ html: string; finalUrl: string }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Largadia/1.0 (cadastro de corridas)", Accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`A página respondeu com status ${res.status}.`);
    if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("O link não é uma página HTML.");
    const buf = await res.arrayBuffer();
    return { html: new TextDecoder().decode(buf.slice(0, MAX_BYTES)), finalUrl: url.toString() };
  }
  throw new Error("Muitos redirecionamentos.");
}
