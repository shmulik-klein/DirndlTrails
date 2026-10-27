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
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import type { Hike } from "@/lib/hikeSchema";
import { getMapStyleUrl, type MapStyle } from "@/lib/useMapStyle";
import { weatherMeta } from "@/lib/weather";
import "@/lib/leafletIcons";

type Props = {
  hikes: Hike[];
  focusHikeId?: string | null;
  mapStyle: MapStyle;
  onRemoveHike?: (hike: Hike) => void;
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

function HikePopup({
  hike,
  onRemove,
}: {
  hike: Hike;
  onRemove?: (hike: Hike) => void;
}) {
  const difficulty = difficultyMeta[hike.difficulty] ?? difficultyMeta.moderate;
  const status = hike.status ?? "done";
  const stats = [
    formatDistance(hike.distanceKm),
    formatElevation(hike.elevationGainM),
    formatDuration(hike.durationMin),
  ].filter((value): value is string => Boolean(value));

  const handleRemove = () => {
    if (!onRemove) return;
    if (
      window.confirm(
        `Remove "${hike.name}" from the map? This action cannot be undone.`
      )
    ) {
      onRemove(hike);
    }
  };

  return (
    <div className="w-64 space-y-2.5 text-slate-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
          {hike.name}
        </h2>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${difficulty.badge}`}
          >
            {difficulty.label}
          </span>
          {status === "planned" ? (
            <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              Planned
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{formatHikeDate(hike.date)}</span>
        {hike.weather && weatherMeta[hike.weather] ? (
          <span
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${weatherMeta[hike.weather].badge}`}
          >
            <WeatherIcon weather={hike.weather} className="h-3 w-3" title={false} />
            {weatherMeta[hike.weather].label}
          </span>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {stats.map((stat, index) => (
            <span key={stat} className="flex items-center gap-2">
              {stat}
              {index < stats.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500"
                />
              ) : null}
            </span>
          ))}
        </p>
      ) : null}

      {hike.description ? (
        <div className="rounded-lg bg-slate-50/90 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-slate-800/50 dark:ring-slate-700/70">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {hike.description}
          </p>
        </div>
      ) : null}

      {hike.photos.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {hike.photos.map((photo, index) => (
            <a
              key={photo}
              href={photo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:decoration-emerald-500/40 dark:hover:text-emerald-300"
            >
              {hike.photos.length === 1 ? "Photos" : `Photo ${index + 1}`}
            </a>
          ))}
        </div>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          onClick={handleRemove}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M5 6V12M8 6V12M11 6V12M4 4L4.5 12C4.5 12.5523 4.94772 13 5.5 13H10.5C11.0523 13 11.5 12.5523 11.5 12L12 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Remove hike
        </button>
      ) : null}
    </div>
  );
}

export default function Map({ hikes, focusHikeId, mapStyle, onRemoveHike }: Props) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        key={mapStyle}
        attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={getMapStyleUrl(mapStyle, apiKey)}
        tileSize={512}
        zoomOffset={-1}
      />

      <FitAllHikes hikes={hikes} />
      <FocusHike
        hikes={hikes}
        focusHikeId={focusHikeId}
        markerRefs={markerRefs}
      />

      {hikes.map((hike) => {
        const status = hike.status ?? "done";

        return (
          <Marker
            key={hike.id}
            position={hike.position}
            opacity={status === "planned" ? 0.7 : 1}
            ref={(marker) => {
              markerRefs.current[hike.id] = marker;
            }}
          >
            <Popup>
              <HikePopup hike={hike} onRemove={onRemoveHike} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
