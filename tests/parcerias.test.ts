import { describe, expect, it } from "vitest";
import { googleCalendarUrl, platformName, platformOf, raceIcs, trackedUrl } from "@/domain/corridas/links";
import { cleanTitle, extractCityState, extractDate, extractDistances, extractRaceDraft } from "@/domain/importacao/extrair";
import { monthPath, parseMonth, shiftMonth } from "@/lib/months";
import { adminRaceSchema } from "@/domain/corridas/admin-schema";

describe("links de inscrição rastreados", () => {
  it("identifica a plataforma pelo domínio, com ou sem www e subdomínio", () => {
    expect(platformOf("https://www.ticketsports.com.br/e/abc")).toBe("ticketsports.com.br");
    expect(platformOf("https://eventos.sympla.com.br/x")).toBe("sympla.com.br");
    expect(platformOf("https://corridadobairro.com.br")).toBe("corridadobairro.com.br");
    expect(platformName("https://www.ticketsports.com.br/e/abc")).toBe("Ticket Sports");
  });
  it("acrescenta os parâmetros do parceiro sem apagar os existentes", () => {
    const u = new URL(trackedUrl("https://www.ticketsports.com.br/e/prova-123?lote=2"));
    expect(u.searchParams.get("lote")).toBe("2");
    expect(u.searchParams.get("origem")).toBe("largadia");
    expect(u.searchParams.get("campanha")).toBe("largadia");
  });
  it("não sobrescreve parâmetro já presente e usa utm em domínio desconhecido", () => {
    expect(new URL(trackedUrl("https://ticketsports.com.br/e/x?origem=outro")).searchParams.get("origem")).toBe("outro");
    expect(new URL(trackedUrl("https://site.com.br/inscricao")).searchParams.get("utm_source")).toBe("largadia");
  });
  it("ignora links que não são http(s)", () => {
    expect(trackedUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

const race = {
  id: "abc",
  slug: "corrida-teste-2026",
  name: "Corrida, Teste; 10K",
  startsAt: new Date("2026-11-08T10:00:00Z"),
  venue: "Parque",
  city: "São Paulo",
  state: "SP",
};

describe("agenda", () => {
  it("gera link do Google Agenda com início e fim em UTC", () => {
    const u = new URL(googleCalendarUrl(race, "https://largadia.com.br"));
    expect(u.searchParams.get("dates")).toBe("20261108T100000Z/20261108T130000Z");
  });
  it("gera .ics com CRLF e texto escapado", () => {
    const ics = raceIcs(race, "https://largadia.com.br", new Date("2026-10-31T00:00:00Z"));
    expect(ics).toContain("\r\nDTSTART:20261108T100000Z\r\n");
    expect(ics).toContain("SUMMARY:Corrida\\, Teste\\; 10K");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });
});

describe("calendário mensal", () => {
  it("monta e lê caminhos de mês", () => {
    expect(monthPath(2027, 3)).toBe("/calendario/2027/marco");
    expect(parseMonth("2027", "marco")).toEqual({ year: 2027, month: 3 });
    expect(parseMonth("2027", encodeURIComponent("março"))).toEqual({ year: 2027, month: 3 });
    expect(parseMonth("2027", "abc")).toBeNull();
    expect(parseMonth("99", "maio")).toBeNull();
  });
  it("vira o ano", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 });
  });
});

describe("extração de dados da página da prova", () => {
  it("lê distâncias, datas e cidade do texto", () => {
    expect(extractDistances("caminhada de 3KM e corridas de 5KM e 10 km, meia 21,1k")).toEqual([3, 5, 10, 21.1]);
    expect(extractDistances("telefone 11 99999-9999, 2000 km")).toEqual([]);
    expect(extractDate("Data: Sexta-feira, 20 de novembro de 2026")).toBe("2026-11-20");
    expect(extractDate("dia 07/03/2027 às 7h")).toBe("2027-03-07");
    expect(extractCityState("Praça Charles Miller – Pacaembu, São Paulo/SP")).toEqual({ city: "São Paulo", state: "SP" });
    expect(cleanTitle("Trilhas Secretas — Inscrições | MovNow")).toBe("Trilhas Secretas");
  });

  it("prioriza JSON-LD de evento e converte o horário para Brasília", () => {
    const html = `<html><head>
      <meta property="og:title" content="Outro título | Plataforma">
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"SportsEvent","name":"Meia do Litoral","startDate":"2027-04-11T09:00:00Z","location":{"@type":"Place","name":"Orla","address":{"addressLocality":"Santos","addressRegion":"SP"}},"organizer":{"name":"Org X"},"image":"https://img/x.jpg"}]}</script>
      </head><body>Percursos de 5k, 10k e 21km</body></html>`;
    const d = extractRaceDraft(html, "https://www.ticketsports.com.br/e/meia");
    expect(d).toMatchObject({
      name: "Meia do Litoral",
      date: "2027-04-11",
      time: "06:00",
      city: "Santos",
      state: "SP",
      venue: "Orla",
      organizer: "Org X",
      imageSuggestion: "https://img/x.jpg",
      distances: [5, 10, 21],
    });
  });

  it("usa OpenGraph e texto quando não há JSON-LD", () => {
    const html = `<title>Trilhas Secretas — Inscrições | MovNow</title><meta property="og:description" content="São Paulo/SP"><p>3 de outubro de 2026 — percurso de 12km</p>`;
    const d = extractRaceDraft(html, "https://www.movnow.com.br/eventos/313");
    expect(d).toMatchObject({ name: "Trilhas Secretas", city: "São Paulo", state: "SP", date: "2026-10-03", distances: [12] });
    expect(d.description).toBeUndefined();
  });
});

describe("formulário do admin", () => {
  const base = {
    name: "Corrida Antiga",
    date: "2020-01-05",
    time: "07:30",
    city: "Recife",
    state: "PE",
    venue: "Marco Zero",
    distances: "10 5 5 21,1",
    type: "RUA",
    priceMin: "0",
    priceMax: "50",
    registrationUrl: "https://exemplo.com.br",
    registrationStatus: "ENCERRADAS",
    organizer: "Org",
    description: "Descrição da prova.",
    moderationStatus: "APROVADA",
  };
  it("aceita data passada e normaliza distâncias", () => {
    const r = adminRaceSchema.parse(base);
    expect(r.distances).toEqual([5, 10, 21.1]);
    expect(r.startsAt.toISOString()).toBe("2020-01-05T10:30:00.000Z");
    expect(r.featured).toBe(false);
  });
  it("exige latitude e longitude juntas e slug válido", () => {
    expect(adminRaceSchema.safeParse({ ...base, lat: "-8.06" }).success).toBe(false);
    expect(adminRaceSchema.safeParse({ ...base, slug: "Slug Inválido" }).success).toBe(false);
    expect(adminRaceSchema.safeParse({ ...base, lat: "-8.06", lng: "-34.87", slug: "corrida-antiga-2020" }).success).toBe(true);
  });
});
