import "server-only";

/**
 * Geocodificação aproximada via Nominatim (OpenStreetMap). Uso de baixo volume
 * (só envios de organizadores); falha silenciosa e o admin ajusta na revisão.
 * Política de uso: https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    const res = await fetch(url, {
      headers: { "User-Agent": "Largadia/1.0 (agenda de corridas)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
