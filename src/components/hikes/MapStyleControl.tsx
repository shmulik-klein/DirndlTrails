import type { BaseMapStyle } from "@/lib/useMapStyle";

type Props = {
  baseStyle: BaseMapStyle;
  onChange: (style: BaseMapStyle) => void;
};

const styles: BaseMapStyle[] = ["streets", "topo", "outdoor"];

const labels: Record<BaseMapStyle, string> = {
  streets: "Streets",
  topo: "Topographic",
  outdoor: "Outdoor",
};

export function MapStyleControl({ baseStyle, onChange }: Props) {
  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 z-[900]">
      <label className="sr-only" htmlFor="map-style-select">
        Map style
      </label>
      <select
        id="map-style-select"
        value={baseStyle}
        onChange={(event) => onChange(event.target.value as BaseMapStyle)}
        className="rounded-full border border-white/60 bg-white/95 px-4 py-2 text-sm font-medium text-slate-800 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-900"
      >
        {styles.map((mapStyle) => (
          <option key={mapStyle} value={mapStyle}>
            {labels[mapStyle]}
          </option>
        ))}
      </select>
    </div>
  );
}
