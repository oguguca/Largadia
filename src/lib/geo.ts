const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Caixa que contém o círculo de raio `km`; serve de pré-filtro barato no banco. */
export function boundingBox(lat: number, lng: number, km: number) {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos(toRad(lat)), 0.01));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}
