import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getNearbyRaces } from "@/domain/corridas/queries";

const schema = z.object({
  lat: z.coerce.number().min(-34).max(6),
  lng: z.coerce.number().min(-74).max(-28),
});

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  const races = await getNearbyRaces(parsed.data.lat, parsed.data.lng, 150, 8);
  return NextResponse.json({ races });
}
