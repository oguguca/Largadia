import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteRace, saveRace } from "../actions";
import { RaceAdminForm, type RaceFormValues } from "../race-admin-form";

const toBrt = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString();

export default async function EditarCorridaPage(props: PageProps<"/admin/corridas/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const race = await db.race.findUnique({ where: { id }, include: { _count: { select: { clicks: true } } } });
  if (!race) notFound();

  const initial: RaceFormValues = {
    name: race.name,
    slug: race.slug,
    date: toBrt(race.startsAt).slice(0, 10),
    time: toBrt(race.startsAt).slice(11, 16),
    city: race.city,
    state: race.state,
    venue: race.venue,
    distances: race.distancesKm.join(" "),
    type: race.type,
    priceMin: String(race.priceMinCents / 100),
    priceMax: String(race.priceMaxCents / 100),
    registrationUrl: race.registrationUrl,
    registrationStatus: race.registrationStatus,
    registrationOpensAt: race.registrationOpensAt ? toBrt(race.registrationOpensAt).slice(0, 10) : "",
    organizer: race.organizer,
    organizerEmail: race.organizerEmail ?? "",
    description: race.description,
    imageUrl: race.imageUrl ?? "",
    sourceUrl: race.sourceUrl ?? "",
    lat: race.lat?.toString() ?? "",
    lng: race.lng?.toString() ?? "",
    couponCode: race.couponCode ?? "",
    couponLabel: race.couponLabel ?? "",
    featured: race.featured ? "on" : "",
    featuredOrder: race.featuredOrder?.toString() ?? "",
    moderationStatus: race.moderationStatus,
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold italic uppercase">{race.name}</h1>
        <p className="text-sm text-asfalto-500">
          {race._count.clicks} clique(s) ·{" "}
          {race.moderationStatus === "APROVADA" && (
            <Link href={`/corrida/${race.slug}`} target="_blank" className="text-largada-600 hover:underline">
              ver no site ↗
            </Link>
          )}
        </p>
      </div>
      {(sp.falta === "revisao" || race.moderationNote) && (
        <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
          {race.moderationNote ?? "Informe as distâncias antes de aprovar."} Ao salvar este formulário a prova conta como revisada.
        </p>
      )}
      {sp.falta === "coordenadas" && (
        <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
          Para aprovar, informe latitude e longitude (ou deixe vazio para tentarmos encontrar) e salve como Publicada.
        </p>
      )}

      <RaceAdminForm action={saveRace.bind(null, race.id)} initial={initial} submitLabel="Salvar alterações" />

      <form action={deleteRace.bind(null, race.id)} className="space-y-2 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
        <p className="text-sm font-semibold text-red-800">Excluir corrida</p>
        <p className="text-xs text-red-700">Remove a corrida e o histórico de cliques. Para tirar do ar sem apagar, marque como Recusada.</p>
        {sp.erro === "confirmacao" && <p className="text-xs font-semibold text-red-700">Digite EXCLUIR para confirmar.</p>}
        <div className="flex gap-2">
          <input name="confirmar" placeholder="Digite EXCLUIR" className="rounded-lg border border-red-300 px-3 py-1.5 text-sm" />
          <button className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">Excluir</button>
        </div>
      </form>
    </div>
  );
}
