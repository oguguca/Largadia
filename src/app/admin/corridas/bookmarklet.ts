export const BOOKMARKLET_PING = "largadia:pronto";
export const BOOKMARKLET_TYPE = "largadia:prova";

/**
 * Código do favorito "Enviar ao Largadia". Roda na página da prova aberta pelo admin, lê o que
 * o navegador já mostra (JSON-LD, OpenGraph e texto visível) e manda para /admin/corridas/receber
 * por postMessage, só depois do aviso de pronto vindo da origem do Largadia.
 */
export function buildBookmarklet(origin: string): string {
  const code = `(()=>{
const L=${JSON.stringify(origin)};
const sel='script[type="application/ld+json"],meta[property^="og:"],meta[name="description"],title';
const d={tipo:${JSON.stringify(BOOKMARKLET_TYPE)},url:location.href,
head:[...document.querySelectorAll(sel)].map(e=>e.outerHTML).join("").slice(0,200000),
text:(document.querySelector("main")||document.body).innerText.slice(0,60000),
pdfs:[...new Set([...document.querySelectorAll("a[href]")].map(a=>a.href).filter(h=>/^https?:.*\\.pdf(\\?|#|$)/i.test(h)))].slice(0,5)};
const w=window.open(L+"/admin/corridas/receber","_blank");
if(!w){alert("Permita pop-ups para enviar ao Largadia.");return;}
const h=e=>{if(e.origin===L&&e.source===w&&e.data===${JSON.stringify(BOOKMARKLET_PING)}){w.postMessage(d,L);removeEventListener("message",h);}};
addEventListener("message",h);
})()`;
  return `javascript:${encodeURIComponent(code.replace(/\n/g, ""))}`;
}

export const CALENDAR_TYPE = "largadia:calendario";

/**
 * Código do favorito "Enviar calendário ao Largadia". Roda no calendário da Ticket Sports ou da Yescom
 * aberto pelo admin e lê só os cartões já carregados na tela (link, nome, imagem, linhas de texto e,
 * na Yescom, a situação marcada no cartão). Na Yescom também lê os outros anos do calendário
 * (os links 2025, 2026, 2027… do topo), abrindo essas páginas pelo próprio navegador.
 * Não chama nenhuma API da plataforma: quem carrega a lista é o próprio navegador do admin.
 */
export function buildCalendarBookmarklet(origin: string): string {
  // A janela do Largadia abre já no clique (senão o navegador bloqueia o pop-up depois da espera);
  // a lista vai quando a janela avisar que está pronta e os outros anos da Yescom tiverem carregado.
  const code = `(()=>{
const L=${JSON.stringify(origin)};
const T=s=>(s||"").trim();
const yes=/(^|\\.)yescom\\.com\\.br$/.test(location.hostname);
const ts=()=>{const seen=new Set();
return [...document.querySelectorAll('a[href*="/e/"]')].filter(a=>a.querySelector("img")&&!seen.has(a.href)&&seen.add(a.href)).map(a=>{
const i=a.querySelector("img");const n=a.querySelector("strong");
return {source:"ticketsports",url:a.href,name:T((n&&n.innerText)||i.alt),image:/^https?:/.test(i.src)?i.src:undefined,
lines:a.innerText.split(/\\n+/).map(t=>t.trim()).filter(Boolean).slice(0,10)};
}).filter(c=>c.name);};
const read=(doc,base)=>[...doc.querySelectorAll(".evento-card")].map(c=>{
const a=c.querySelector("a[href]");const i=c.querySelector("img");const col=c.closest(".evento-col");
const st=col?["aberto","esgotado","breve","expo","atencao"].find(k=>col.classList.contains(k)):undefined;
const abs=u=>u?new URL(u,base).href:"";const src=i&&abs(i.getAttribute("src"));
return {source:"yescom",url:a?abs(a.getAttribute("href")):"",name:T(c.querySelector("h2")&&c.querySelector("h2").textContent),image:/^https?:/.test(src||"")?src:undefined,
lines:[c.querySelector(".evento-data"),c.querySelector(".evento-local")].map(e=>T(e&&e.textContent).replace(/\\s+/g," ")).filter(Boolean),status:st};
}).filter(c=>c.name&&c.url);
const ycom=async()=>{let cards=read(document,location.href);
const now=new Date().getFullYear();
const years=[...new Set([...document.querySelectorAll("a[href]")].filter(a=>/^https?:$/.test(a.protocol)&&a.hostname===location.hostname).map(a=>a.href.split("#")[0]).filter(h=>{const m=/calendarioYescom\\w*?(\\d{4})\\.html$/i.exec(h);return m&&+m[1]>=now&&h!==location.href.split("#")[0];}))];
for(const y of years){try{const html=await (await fetch(y)).text();cards=cards.concat(read(new DOMParser().parseFromString(html,"text/html"),y));}catch(e){}}
return cards;};
const first=yes?read(document,location.href):ts();
if(!first.length){alert("Nenhuma prova na tela. Abra o calendário da Ticket Sports ou da Yescom e carregue os eventos.");return;}
const w=window.open(L+"/admin/corridas/receber-calendario","_blank");
if(!w){alert("Permita pop-ups para enviar ao Largadia.");return;}
const all=yes?ycom():Promise.resolve(first);
const h=async e=>{if(e.origin===L&&e.source===w&&e.data===${JSON.stringify(BOOKMARKLET_PING)}){removeEventListener("message",h);
w.postMessage({tipo:${JSON.stringify(CALENDAR_TYPE)},cards:(await all).slice(0,500)},L);}};
addEventListener("message",h);
})()`;
  return `javascript:${encodeURIComponent(code.replace(/\n/g, ""))}`;
}
