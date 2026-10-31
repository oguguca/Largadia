import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { RaceType, RegistrationStatus, ModerationStatus } from "../src/generated/prisma/enums";
import { slugify } from "../src/lib/slug";
import { addDays, startOfDayBrt, weekdayBrt } from "../src/lib/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type SeedRace = {
  name: string;
  /** Dias a partir de hoje, ou "sab"/"dom" para o fim de semana atual/próximo */
  when: number | "sab" | "dom";
  time: string;
  city: string;
  state: string;
  venue: string;
  lat: number;
  lng: number;
  distances: number[];
  type: RaceType;
  price: [number, number];
  status: RegistrationStatus;
  /** Para EM_BREVE: dias até abrir as inscrições */
  opensIn?: number;
  organizer: string;
  description: string;
  moderation?: ModerationStatus;
};

const races: SeedRace[] = [
  { name: "Corrida Noturna da Paulista", when: "sab", time: "20:00", city: "São Paulo", state: "SP", venue: "Avenida Paulista, em frente ao MASP", lat: -23.5614, lng: -46.6559, distances: [5, 10], type: "NOTURNA", price: [119, 149], status: "ABERTAS", organizer: "Ritmo Eventos Esportivos", description: "Percurso plano pela avenida mais famosa da cidade, com iluminação especial, DJ na chegada e medalha que brilha no escuro.\n\nRetirada do kit na sexta-feira, no shopping parceiro." },
  { name: "Desafio Ibirapuera 10K", when: "dom", time: "07:00", city: "São Paulo", state: "SP", venue: "Parque Ibirapuera, Portão 3", lat: -23.5874, lng: -46.6576, distances: [5, 10], type: "RUA", price: [99, 129], status: "ABERTAS", organizer: "Clube Pé na Pista", description: "Duas voltas pelo entorno do parque, com hidratação a cada 2,5 km e cronometragem por chip." },
  { name: "Circuito Orla de Copacabana", when: "dom", time: "06:30", city: "Rio de Janeiro", state: "RJ", venue: "Posto 6, Copacabana", lat: -22.9867, lng: -43.1891, distances: [5, 10, 21.1], type: "RUA", price: [110, 189], status: "ABERTAS", organizer: "Carioca Run", description: "Largada no Posto 6 com vista para o mar. A meia maratona segue até o Leme e volta pelo Aterro." },
  { name: "Trail Serra do Curral", when: "sab", time: "07:30", city: "Belo Horizonte", state: "MG", venue: "Parque da Serra do Curral", lat: -19.9486, lng: -43.9133, distances: [8, 15, 25], type: "TRAIL", price: [140, 210], status: "ABERTAS", organizer: "Montanha Outdoor", description: "Trilhas técnicas com subidas fortes e vista da cidade inteira. Obrigatório levar reservatório de água de 500 ml." },
  { name: "Meia Maratona de São Paulo 2027", when: 98, time: "06:00", city: "São Paulo", state: "SP", venue: "Praça Charles Miller, Pacaembu", lat: -23.5475, lng: -46.6653, distances: [5, 10, 21.1], type: "RUA", price: [149, 259], status: "EM_BREVE", opensIn: 10, organizer: "Ritmo Eventos Esportivos", description: "A meia mais tradicional da capital passa pelo centro histórico e pelo Minhocão. Inscrições abrem em breve, com lote promocional limitado." },
  { name: "Maratona de Porto Alegre", when: 196, time: "06:30", city: "Porto Alegre", state: "RS", venue: "Usina do Gasômetro", lat: -30.0346, lng: -51.2413, distances: [5, 10, 21.1, 42.195], type: "RUA", price: [130, 320], status: "EM_BREVE", opensIn: 21, organizer: "Pampa Corridas", description: "Percurso plano e rápido à beira do Guaíba, ideal para buscar índice e recorde pessoal." },
  { name: "Corrida da Ponte JK", when: 15, time: "06:30", city: "Brasília", state: "DF", venue: "Ponte JK, cabeceira sul", lat: -15.8234, lng: -47.8297, distances: [5, 10], type: "RUA", price: [95, 125], status: "ABERTAS", organizer: "Cerrado Run", description: "Corra sobre um dos cartões-postais de Brasília, com chegada no Pontão do Lago Sul." },
  { name: "Night Run Beira-Mar", when: 22, time: "19:30", city: "Fortaleza", state: "CE", venue: "Aterro da Praia de Iracema", lat: -3.7213, lng: -38.5122, distances: [5, 10], type: "NOTURNA", price: [89, 119], status: "ABERTAS", organizer: "Sol Nascente Eventos", description: "Largada ao pôr do sol e percurso pela Avenida Beira-Mar com brisa do mar." },
  { name: "Corrida Solidária Amigos do Bem", when: 29, time: "07:00", city: "Recife", state: "PE", venue: "Parque da Jaqueira", lat: -8.0367, lng: -34.9006, distances: [3, 5], type: "SOLIDARIA", price: [40, 60], status: "ABERTAS", organizer: "Instituto Corrida que Transforma", description: "Toda a renda vai para projetos de esporte em comunidades do Recife. Doe 1 kg de alimento na retirada do kit." },
  { name: "Volta da Lagoa da Pampulha", when: 36, time: "06:30", city: "Belo Horizonte", state: "MG", venue: "Igrejinha da Pampulha", lat: -19.8584, lng: -43.9781, distances: [10, 18], type: "RUA", price: [115, 165], status: "ABERTAS", organizer: "Montanha Outdoor", description: "A volta completa na lagoa tem 18 km. Para quem prefere, há a opção de 10 km." },
  { name: "Kids Run Parque Barigui", when: 13, time: "08:30", city: "Curitiba", state: "PR", venue: "Parque Barigui", lat: -25.4239, lng: -49.3093, distances: [0.5, 1, 2], type: "KIDS", price: [35, 35], status: "ABERTAS", organizer: "Curitiba Ativa", description: "Corrida para crianças de 3 a 14 anos, com baterias por idade, medalha para todos e recreação." },
  { name: "Corrida das Capivaras", when: 43, time: "07:00", city: "Curitiba", state: "PR", venue: "Parque Barigui", lat: -25.4239, lng: -49.3093, distances: [5, 10], type: "TEMATICA", price: [99, 139], status: "ABERTAS", organizer: "Curitiba Ativa", description: "Venha fantasiado! Prêmio para a melhor fantasia de capivara e kit com pelúcia exclusiva." },
  { name: "Ultra Chapada dos Veadeiros", when: 120, time: "05:00", city: "Alto Paraíso de Goiás", state: "GO", venue: "Vila de São Jorge", lat: -14.1748, lng: -47.8155, distances: [21, 50, 80], type: "TRAIL", price: [290, 590], status: "EM_BREVE", opensIn: 5, organizer: "Cerrado Trail Series", description: "Ultramaratona por trilhas, cachoeiras e cânions do cerrado. Exige experiência prévia em provas longas de montanha." },
  { name: "Corrida do Farol da Barra", when: 20, time: "06:00", city: "Salvador", state: "BA", venue: "Farol da Barra", lat: -13.0104, lng: -38.5326, distances: [5, 10], type: "RUA", price: [90, 120], status: "ESGOTADAS", organizer: "Axé Run", description: "Uma das provas mais concorridas da Bahia. Percurso pela orla da Barra até Ondina." },
  { name: "Meia Maratona de Salvador", when: 85, time: "05:30", city: "Salvador", state: "BA", venue: "Jardim de Alah", lat: -12.9984, lng: -38.4615, distances: [5, 10, 21.1], type: "RUA", price: [120, 210], status: "EM_BREVE", opensIn: 14, organizer: "Axé Run", description: "Percurso pela orla atlântica, com largada cedo para fugir do calor." },
  { name: "Corrida Ponta Negra", when: 27, time: "06:00", city: "Manaus", state: "AM", venue: "Calçadão da Ponta Negra", lat: -3.0846, lng: -60.0711, distances: [5, 10], type: "RUA", price: [85, 110], status: "ABERTAS", organizer: "Amazônia Esportes", description: "Corrida às margens do Rio Negro, com hidratação reforçada e frutas regionais na chegada." },
  { name: "Circuito Ilha da Magia", when: 50, time: "07:00", city: "Florianópolis", state: "SC", venue: "Beira-Mar Norte", lat: -27.5838, lng: -48.5536, distances: [5, 10, 21.1], type: "RUA", price: [119, 199], status: "ABERTAS", organizer: "Ilha Run", description: "A Beira-Mar Norte é palco de um percurso plano com vista para as pontes." },
  { name: "Trail Lagoa da Conceição", when: 64, time: "07:00", city: "Florianópolis", state: "SC", venue: "Trilha da Costa da Lagoa", lat: -27.5966, lng: -48.4643, distances: [12, 24], type: "TRAIL", price: [150, 230], status: "ABERTAS", organizer: "Ilha Run", description: "Trilha histórica à beira da lagoa, com trechos de areia e travessia de pontes de madeira." },
  { name: "Corrida do Parque da Cidade", when: 9, time: "07:00", city: "Brasília", state: "DF", venue: "Parque da Cidade Sarah Kubitschek", lat: -15.8007, lng: -47.9068, distances: [5, 10], type: "RUA", price: [0, 0], status: "ABERTAS", organizer: "Prefeitura Esportiva do DF", description: "Corrida gratuita de incentivo ao esporte. Vagas limitadas por ordem de inscrição." },
  { name: "Corrida da Lua Cheia", when: 33, time: "20:30", city: "Natal", state: "RN", venue: "Via Costeira", lat: -5.8466, lng: -35.1857, distances: [5, 10], type: "NOTURNA", price: [95, 125], status: "ABERTAS", organizer: "Potiguar Run", description: "Largada na noite de lua cheia pela Via Costeira, entre as dunas e o mar." },
  { name: "Desafio Cristo Redentor", when: 71, time: "06:00", city: "Rio de Janeiro", state: "RJ", venue: "Estrada das Paineiras", lat: -22.9497, lng: -43.2104, distances: [7, 14], type: "TRAIL", price: [160, 220], status: "ABERTAS", organizer: "Carioca Run", description: "Subida forte pela floresta da Tijuca até os pés do Cristo. Um dos desafios mais bonitos do Brasil." },
  { name: "Maratona da Zona Oeste", when: 210, time: "05:30", city: "Rio de Janeiro", state: "RJ", venue: "Recreio dos Bandeirantes", lat: -23.0255, lng: -43.4637, distances: [21.1, 42.195], type: "RUA", price: [220, 380], status: "EM_BREVE", opensIn: 30, organizer: "Carioca Run", description: "Percurso pela orla da zona oeste até o Aterro do Flamengo." },
  { name: "Corrida Rústica de Campinas", when: 18, time: "07:00", city: "Campinas", state: "SP", venue: "Lagoa do Taquaral", lat: -22.8726, lng: -47.0547, distances: [5, 10], type: "RUA", price: [79, 99], status: "ABERTAS", organizer: "Interior Run", description: "Tradicional corrida do interior paulista, com percurso em volta da lagoa." },
  { name: "Corrida Rosa contra o Câncer", when: 6, time: "07:30", city: "Goiânia", state: "GO", venue: "Parque Vaca Brava", lat: -16.7108, lng: -49.2729, distances: [3, 5], type: "SOLIDARIA", price: [50, 70], status: "ABERTAS", organizer: "Rede Rosa Goiás", description: "Caminhada e corrida para conscientização sobre a prevenção do câncer de mama." },
  { name: "Corrida de Natal dos Pais Noéis", when: 54, time: "18:00", city: "Belém", state: "PA", venue: "Estação das Docas", lat: -1.4502, lng: -48.5016, distances: [5], type: "TEMATICA", price: [79, 79], status: "ABERTAS", organizer: "Pará Corridas", description: "Todo inscrito ganha uma roupa de Papai Noel. Clima de festa e confraternização na chegada." },
  { name: "Circuito Parque do Cocó", when: 41, time: "06:00", city: "Fortaleza", state: "CE", venue: "Parque do Cocó", lat: -3.7461, lng: -38.4883, distances: [5, 10, 21.1], type: "RUA", price: [99, 179], status: "ABERTAS", organizer: "Sol Nascente Eventos", description: "Percurso arborizado pelo maior parque urbano do Nordeste." },
  { name: "Corrida das Pontes de Teresina", when: 25, time: "06:00", city: "Teresina", state: "PI", venue: "Ponte Estaiada João Isidoro França", lat: -5.0786, lng: -42.7895, distances: [5, 10], type: "RUA", price: [70, 90], status: "ABERTAS", organizer: "Piauí em Movimento", description: "Corrida que liga as margens do Rio Poti, passando por três pontes." },
  { name: "Corrida do Bosque", when: 57, time: "07:00", city: "Ribeirão Preto", state: "SP", venue: "Bosque Municipal Fábio Barreto", lat: -21.1889, lng: -47.8042, distances: [5, 10], type: "RUA", price: [75, 95], status: "ENCERRADAS", organizer: "Interior Run", description: "Inscrições encerradas por limite de vagas. Fique de olho na lista de espera no site oficial." },
  { name: "Night Trail Pico do Jaraguá", when: 78, time: "19:00", city: "São Paulo", state: "SP", venue: "Parque Estadual do Jaraguá", lat: -23.4565, lng: -46.7663, distances: [6, 12], type: "TRAIL", price: [130, 170], status: "ABERTAS", organizer: "Montanha Outdoor", description: "Trail noturno até o ponto mais alto da cidade. Lanterna de cabeça obrigatória." },
  { name: "Corrida Orla de Vitória", when: 31, time: "06:30", city: "Vitória", state: "ES", venue: "Praia de Camburi", lat: -20.2756, lng: -40.2876, distances: [5, 10, 21.1], type: "RUA", price: [99, 169], status: "ABERTAS", organizer: "Capixaba Run", description: "Percurso plano por toda a extensão de Camburi, com vento a favor na volta." },
  { name: "Corrida do Pantanal", when: 105, time: "06:00", city: "Campo Grande", state: "MS", venue: "Parque das Nações Indígenas", lat: -20.4553, lng: -54.5747, distances: [5, 10, 21.1], type: "RUA", price: [90, 160], status: "EM_BREVE", opensIn: 7, organizer: "MS Esportes", description: "Corra entre capivaras e tuiuiús no maior parque urbano do Centro-Oeste." },
  { name: "Corrida Cultural Pelourinho", when: 47, time: "07:00", city: "Salvador", state: "BA", venue: "Largo do Pelourinho", lat: -12.9714, lng: -38.5108, distances: [5], type: "TEMATICA", price: [70, 70], status: "ABERTAS", organizer: "Axé Run", description: "Percurso pelo centro histórico com bandas de percussão ao longo do caminho." },
  { name: "Corrida da Independência de João Pessoa", when: 60, time: "05:30", city: "João Pessoa", state: "PB", venue: "Busto de Tamandaré", lat: -7.1175, lng: -34.8236, distances: [5, 10], type: "RUA", price: [80, 100], status: "ABERTAS", organizer: "Paraíba Corre", description: "Largada no ponto mais oriental das Américas, com o nascer do sol mais cedo do Brasil." },
  { name: "Volta Cuiabana", when: 39, time: "06:00", city: "Cuiabá", state: "MT", venue: "Parque das Águas", lat: -15.5698, lng: -56.0777, distances: [5, 10], type: "RUA", price: [80, 110], status: "ABERTAS", organizer: "MT Run", description: "Largada bem cedo para fugir do calor cuiabano, com pontos extras de hidratação." },
  // Pendentes de moderação, para testar o painel admin na fase 3
  { name: "Corrida do Sol Nascente de Maceió", when: 45, time: "05:30", city: "Maceió", state: "AL", venue: "Orla de Ponta Verde", lat: -9.6658, lng: -35.7109, distances: [5, 10], type: "RUA", price: [85, 105], status: "ABERTAS", organizer: "Alagoas Run", description: "Percurso pela orla de Ponta Verde e Jatiúca, com piscinas naturais ao fundo.", moderation: "PENDENTE" },
  { name: "Desafio Serra Gaúcha", when: 90, time: "07:00", city: "Gramado", state: "RS", venue: "Lago Negro", lat: -29.3911, lng: -50.8763, distances: [10, 21.1], type: "TRAIL", price: [180, 260], status: "EM_BREVE", opensIn: 12, organizer: "Serra Trail", description: "Subidas e descidas entre araucárias e hortênsias, com chegada no centro de Gramado.", moderation: "PENDENTE" },
];

/** Resolve "sab"/"dom" para o fim de semana atual (se ainda não passou) ou o próximo. */
function resolveDay(when: SeedRace["when"], today: Date): Date {
  if (typeof when === "number") return addDays(today, when);
  const wd = weekdayBrt(today);
  const daysToSat = wd === 0 ? -1 : (6 - wd) % 7;
  const sat = addDays(today, daysToSat);
  return when === "sab" ? (daysToSat < 0 ? addDays(sat, 7) : sat) : addDays(sat, 1);
}

async function main() {
  const today = startOfDayBrt(new Date());
  await db.race.deleteMany();

  for (const r of races) {
    const [h, m] = r.time.split(":").map(Number);
    const startsAt = new Date(resolveDay(r.when, today).getTime() + (h * 60 + m) * 60_000);
    const year = new Date(startsAt.getTime() - 3 * 3600_000).getUTCFullYear();
    const slug = slugify(/\d{4}$/.test(r.name) ? r.name : `${r.name} ${year}`);
    await db.race.create({
      data: {
        slug,
        name: r.name,
        startsAt,
        city: r.city,
        citySlug: slugify(r.city),
        state: r.state,
        venue: r.venue,
        lat: r.lat,
        lng: r.lng,
        distancesKm: r.distances,
        type: r.type,
        priceMinCents: r.price[0] * 100,
        priceMaxCents: r.price[1] * 100,
        registrationUrl: `https://example.com/inscricoes/${slug}`,
        registrationStatus: r.status,
        registrationOpensAt: r.opensIn ? addDays(today, r.opensIn) : null,
        organizer: r.organizer,
        organizerEmail: "contato@example.com",
        description: r.description,
        moderationStatus: r.moderation ?? "APROVADA",
      },
    });
  }
  console.log(`Seed concluído: ${races.length} corridas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
