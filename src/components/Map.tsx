import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import {
  difficultyMeta,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHikeDate,
} from "@/lib/format";
import type { Hike } from "@/lib/hikeSchema";
import "@/lib/leafletIcons";
import "leaflet/dist/leaflet.css";

type Props = {
  hikes: Hike[];
  focusHikeId?: string | null;
};

const DEFAULT_CENTER: [number, number] = [
  48.04872322130709, 11.507710066839964,
];

function FitAllHikes({ hikes }: { hikes: Hike[] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (hasFitted.current || hikes.length === 0) return;

    hasFitted.current = true;
    map.fitBounds(
      L.latLngBounds(hikes.map((hike) => hike.position)),
      { padding: [48, 48], maxZoom: 12 }
    );
  }, [hikes, map]);

  return null;
}

function FocusHike({
  hikes,
  focusHikeId,
  markerRefs,
}: {
  hikes: Hike[];
  focusHikeId?: string | null;
  markerRefs: RefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusHikeId) return;

    const hike = hikes.find((entry) => entry.id === focusHikeId);
    if (!hike) return;

    map.flyTo(hike.position, Math.max(map.getZoom(), 12), { duration: 0.8 });

    const timer = window.setTimeout(() => {
      markerRefs.current?.[focusHikeId]?.openPopup();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [focusHikeId, hikes, map, markerRefs]);

  return null;
}

function HikePopup({ hike }: { hike: Hike }) {
  const difficulty = difficultyMeta[hike.difficulty] ?? difficultyMeta.moderate;
  const stats = [
    formatDistance(hike.distanceKm),
    formatElevation(hike.elevationGainM),
    formatDuration(hike.durationMin),
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="w-60 space-y-2 text-slate-800">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug">{hike.name}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${difficulty.badge}`}
        >
          {difficulty.label}
        </span>
      </div>

      <p className="text-xs text-slate-500">{formatHikeDate(hike.date)}</p>

      {stats.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-slate-600">
          {stats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </p>
      ) : null}

      {hike.description ? (
        <p className="text-xs leading-snug text-slate-600">
          {hike.description}
        </p>
      ) : null}

      {hike.photos.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {hike.photos.map((photo, index) => (
            <a
              key={photo}
              href={photo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
            >
              {hike.photos.length === 1 ? "Photos" : `Photo ${index + 1}`}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Map({ hikes, focusHikeId }: Props) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`}
        tileSize={512}
        zoomOffset={-1}
      />

      <FitAllHikes hikes={hikes} />
      <FocusHike
        hikes={hikes}
        focusHikeId={focusHikeId}
        markerRefs={markerRefs}
      />

      {hikes.map((hike) => (
        <Marker
          key={hike.id}
          position={hike.position}
          ref={(marker) => {
            markerRefs.current[hike.id] = marker;
          }}
        >
          <Popup>
            <HikePopup hike={hike} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
