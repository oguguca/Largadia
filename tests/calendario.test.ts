import { describe, expect, it } from "vitest";
import { cardToRace, parseWrittenDate, ticketSportsId, yescomId } from "@/domain/importacao/calendario";

const now = new Date("2026-10-31T15:00:00Z");

type Card = Parameters<typeof cardToRace>[0];

const card = (over: Partial<Card> = {}): Card => ({
  source: "ticketsports",
  url: "https://www.ticketsports.com.br/e/corrida-das-flores-2026-85431",
  name: "CORRIDA DAS FLORES 2026 5KM",
  image: "https://cdn.ticketsports.com.br/ticketagora/images/thumb/x.png",
  lines: ["Paulista, PE", "Data do evento: 01/11/2026", "Inscrições até: 30/10/2026"],
  ...over,
});

describe("ticketSportsId", () => {
  it("usa o número no fim do link do evento", () => {
    expect(ticketSportsId("https://www.ticketsports.com.br/e/corrida-das-flores-2026-85431")).toBe("ticketsports:85431");
  });
  it("recusa outros sites e links sem ID", () => {
    expect(ticketSportsId("https://exemplo.com/e/corrida-85431")).toBeUndefined();
    expect(ticketSportsId("https://www.ticketsports.com.br/calendar/filters")).toBeUndefined();
  });
});

describe("cardToRace", () => {
  it("monta a prova publicada com cidade, data, distância e link de inscrição", () => {
    const r = cardToRace(card(), now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      externalId: "ticketsports:85431",
      name: "Corrida das Flores 2026 5km",
      city: "Paulista",
      state: "PE",
      distancesKm: [5],
      registrationUrl: "https://www.ticketsports.com.br/e/corrida-das-flores-2026-85431",
      registrationStatus: "ENCERRADAS",
      moderationStatus: "APROVADA",
      priceKnown: false,
      timeKnown: false,
    });
    // 01/11/2026 às 7h de Brasília
    expect(r.data.startsAt.toISOString()).toBe("2026-11-01T10:00:00.000Z");
  });

  it("deixa de fora provas que já aconteceram", () => {
    const r = cardToRace(card({ lines: ["Paulista, PE", "Data do evento: 20/10/2026"] }), now);
    expect(r).toMatchObject({ ok: false, reason: "passada" });
  });

  it("mantém a prova do próprio dia", () => {
    expect(cardToRace(card({ lines: ["Paulista, PE", "Data do evento: 31/10/2026"] }), now).ok).toBe(true);
  });

  it("ignora itens que não são provas", () => {
    expect(cardToRace(card({ name: "Taxa de TraNSFERÊNCIA E ATUALIZAÇÃO" }), now)).toMatchObject({ ok: false, reason: "nao-e-prova" });
  });

  it("acusa cartão sem cidade", () => {
    expect(cardToRace(card({ lines: ["Data do evento: 01/11/2026"] }), now)).toMatchObject({ ok: false, reason: "incompleta" });
  });
});

describe("calendário da Yescom", () => {
  const yescom = (over: Partial<Card> = {}): Card => ({
    source: "yescom",
    url: "https://www.yescom.com.br/meiadorio/2027/index.html",
    name: "29ª Meia Maratona Int'l do Rio de Janeiro",
    image: "https://www.yescom.com.br/site/img/eventos2027/meiadorio.png",
    lines: ["16 Agosto 2027", "Leblon/Aterro do Flamengo • RJ"],
    status: "aberto",
    ...over,
  });

  it("lê data por extenso e o local com UF", () => {
    expect(parseWrittenDate("25 Janeiro 2026")).toBe("2026-01-25");
    expect(parseWrittenDate("14 e 15 Agosto 2026")).toBe("2026-08-14");
    expect(parseWrittenDate("09 a 11 Abril 2026")).toBe("2026-04-09");
    const r = cardToRace(yescom(), now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      externalId: "yescom:meiadorio/2027:2027-08-16",
      city: "Rio de Janeiro",
      state: "RJ",
      venue: "Leblon/Aterro do Flamengo",
      distancesKm: [21.1],
      registrationStatus: "ABERTAS",
      organizer: "Yescom",
    });
  });

  it("usa a capital quando o nome não diz a cidade e lê a situação", () => {
    const r = cardToRace(yescom({ name: "6ª Corrida do Café", lines: ["17 Maio 2027", "Praça do Patriarca • SP"], status: "esgotado" }), now);
    expect(r).toMatchObject({ ok: true, data: { city: "São Paulo", registrationStatus: "ESGOTADAS" } });
  });

  it("separa provas diferentes que usam o mesmo site", () => {
    expect(yescomId("https://www.yescom.com.br/maratonasp/2027/index.asp", "2027-04-10", "Corrida das Nações")).not.toBe(
      yescomId("https://www.yescom.com.br/maratonasp/2027/index.asp", "2027-04-11", "Maratona"),
    );
    // "Em breve": o link é o calendário, então o nome entra na chave
    expect(yescomId("https://www.yescom.com.br/site/calendarioYescomnovo2026.html", "2026-12-19", "1ª Hot Wheels Run")).toBe(
      "yescom:evento/1-hot-wheels-run:2026-12-19",
    );
  });

  it("deixa de fora Expo Atleta e eventos com alteração", () => {
    expect(cardToRace(yescom({ name: "Expo Atleta 29ª Meia do Rio", status: "expo" }), now)).toMatchObject({ ok: false, reason: "nao-e-prova" });
    expect(cardToRace(yescom({ status: "atencao" }), now)).toMatchObject({ ok: false });
  });
});
