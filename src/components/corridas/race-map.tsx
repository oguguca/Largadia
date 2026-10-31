"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useMemo } from "react";

export type MapRace = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  dateLabel: string;
  distancesLabel: string;
};

// Ícone em CSS puro: os PNGs padrão do Leaflet quebram com bundlers.
const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ff6b1a;border:3px solid #0a1220;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -20],
});

const BRASIL: [number, number] = [-15.8, -47.9];

export default function RaceMap({ races, center }: { races: MapRace[]; center?: [number, number] }) {
  const bounds = useMemo(
    () => (races.length > 1 ? L.latLngBounds(races.map((r) => [r.lat, r.lng])) : undefined),
    [races],
  );

  return (
    <MapContainer
      center={center ?? (races[0] ? [races[0].lat, races[0].lng] : BRASIL)}
      zoom={races.length === 1 ? 13 : 4}
      bounds={center ? undefined : bounds}
      boundsOptions={{ padding: [30, 30] }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {races.map((r) => (
        <Marker key={r.slug} position={[r.lat, r.lng]} icon={pin}>
          <Popup>
            <a href={`/corrida/${r.slug}`} className="font-semibold">
              {r.name}
            </a>
            <br />
            {r.dateLabel} · {r.city}/{r.state}
            <br />
            {r.distancesLabel}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
