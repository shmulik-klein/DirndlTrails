import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type L from "leaflet";

import { inputClass } from "@/components/ui/Field";
import { getMapStyleUrl } from "@/lib/useMapStyle";
import "@/lib/leafletIcons";

type Position = [number, number];

type Props = {
  value: Position;
  onChange: (position: Position) => void;
};

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function MapSync({ value }: { value: Position }) {
  const map = useMap();
  const [lat, lng] = value;

  useEffect(() => {
    const center = map.getCenter();

    if (
      Math.abs(center.lat - lat) < 0.00001 &&
      Math.abs(center.lng - lng) < 0.00001
    ) {
      return;
    }

    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.5 });
  }, [lat, lng, map]);

  useEffect(() => {
    // The drawer animates in; recalculate the map size after it settles.
    const timer = window.setTimeout(() => map.invalidateSize(), 250);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function ClickToPlace({ onPick }: { onPick: (position: Position) => void }) {
  useMapEvents({
    click(event) {
      onPick([
        roundCoordinate(event.latlng.lat),
        roundCoordinate(event.latlng.lng),
      ]);
    },
  });

  return null;
}

export default function CoordinatePicker({ value, onChange }: Props) {
  const [latText, setLatText] = useState(String(roundCoordinate(value[0])));
  const [lngText, setLngText] = useState(String(roundCoordinate(value[1])));
  const [syncedValue, setSyncedValue] = useState<Position>(value);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

  // Keep the text inputs in sync when the pin moves (map click, drag, or
  // geolocation). Adjusting state during render avoids a prop-syncing effect.
  const roundedLat = roundCoordinate(value[0]);
  const roundedLng = roundCoordinate(value[1]);

  if (roundedLat !== syncedValue[0] || roundedLng !== syncedValue[1]) {
    setSyncedValue([roundedLat, roundedLng]);
    setLatText((current) =>
      current.trim() !== "" && Number(current) === roundedLat
        ? current
        : String(roundedLat)
    );
    setLngText((current) =>
      current.trim() !== "" && Number(current) === roundedLng
        ? current
        : String(roundedLng)
    );
  }

  const parsedLat = Number(latText);
  const parsedLng = Number(lngText);
  const latInvalid =
    latText.trim() === "" || Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90;
  const lngInvalid =
    lngText.trim() === "" ||
    Number.isNaN(parsedLng) ||
    parsedLng < -180 ||
    parsedLng > 180;

  const handleLatChange = (next: string) => {
    setLatText(next);
    const parsed = Number(next);
    if (next.trim() !== "" && !Number.isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      onChange([roundCoordinate(parsed), value[1]]);
    }
  };

  const handleLngChange = (next: string) => {
    setLngText(next);
    const parsed = Number(next);
    if (
      next.trim() !== "" &&
      !Number.isNaN(parsed) &&
      parsed >= -180 &&
      parsed <= 180
    ) {
      onChange([value[0], roundCoordinate(parsed)]);
    }
  };

  const useMyLocation = () => {
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not available in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange([
          roundCoordinate(position.coords.latitude),
          roundCoordinate(position.coords.longitude),
        ]);
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not determine your location."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="h-52 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <MapContainer
          center={value}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={getMapStyleUrl("streets", apiKey)}
            tileSize={512}
            zoomOffset={-1}
          />
          <Marker
            position={value}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as L.Marker;
                const { lat, lng } = marker.getLatLng();
                onChange([roundCoordinate(lat), roundCoordinate(lng)]);
              },
            }}
          />
          <ClickToPlace onPick={onChange} />
          <MapSync value={value} />
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Click the map or drag the pin to set the trail location.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="hike-lat"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Latitude
          </label>
          <input
            id="hike-lat"
            type="number"
            step="any"
            inputMode="decimal"
            value={latText}
            onChange={(event) => handleLatChange(event.target.value)}
            aria-invalid={latInvalid}
            className={inputClass(latInvalid)}
          />
          {latInvalid ? (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Must be between -90 and 90
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="hike-lng"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Longitude
          </label>
          <input
            id="hike-lng"
            type="number"
            step="any"
            inputMode="decimal"
            value={lngText}
            onChange={(event) => handleLngChange(event.target.value)}
            aria-invalid={lngInvalid}
            className={inputClass(lngInvalid)}
          />
          {lngInvalid ? (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Must be between -180 and 180
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true">📍</span>
        {locating ? "Locating…" : "Use my current location"}
      </button>

      {locationError ? (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {locationError}
        </p>
      ) : null}
    </div>
  );
}
