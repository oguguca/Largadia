"use server";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { geocode } from "@/lib/geocode";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formDataToSubmission, raceSubmissionSchema } from "@/domain/corridas/submissao";

export type SubmitState =
  | { ok: true }
  | { ok: false; message?: string; errors?: Record<string, string[] | undefined>; values?: Record<string, unknown> }
  | null;

export async function submitRace(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  // Campo invisível: bots costumam preencher; humanos não.
  if (form.get("website")) return { ok: true };

  const ip = await clientIp();
  if (!(await rateLimit(`organizador:${ip}`, 5, 3600))) {
    return { ok: false, message: "Muitos envios em pouco tempo. Tente novamente em uma hora." };
  }

  const raw = formDataToSubmission(form);
  const parsed = raceSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return { ok: false, errors, values: raw };
  }
  const d = parsed.data;

  const coords = await geocode(`${d.venue}, ${d.city}, ${d.state}`) ?? (await geocode(`${d.city}, ${d.state}`));
  const year = d.startsAt.getUTCFullYear();
  const baseSlug = slugify(d.name.includes(String(year)) ? d.name : `${d.name} ${year}`);

  await db.race.create({
    data: {
      slug: await uniqueSlug(baseSlug),
      name: d.name,
      startsAt: d.startsAt,
      city: d.city,
      citySlug: slugify(d.city),
      state: d.state,
      venue: d.venue,
      distancesKm: d.distances,
      type: d.type,
      priceMinCents: Math.round(d.priceMin * 100),
      priceMaxCents: Math.round(d.priceMax * 100),
      registrationUrl: d.registrationUrl,
      registrationStatus: d.registrationStatus,
      registrationOpensAt: d.registrationOpensAt,
      organizer: d.organizer,
      organizerEmail: d.organizerEmail,
      description: d.description,
      imageUrl: d.imageUrl,
      lat: coords?.lat,
      lng: coords?.lng,
      moderationStatus: "PENDENTE",
    },
  });

  return { ok: true };
}

async function uniqueSlug(base: string): Promise<string> {
  const taken = await db.race.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
