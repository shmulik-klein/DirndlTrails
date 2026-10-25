import { useEffect, useMemo, useState } from "react";

export type BaseMapStyle = "streets" | "topo" | "outdoor";
export type MapStyle = BaseMapStyle | "streets-dark" | "topo-dark" | "outdoor-dark";

const STORAGE_KEY = "dirndltrails:map-style";

const MAP_STYLE_URLS: Record<MapStyle, string> = {
  streets: "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png",
  "streets-dark": "https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png",
  topo: "https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png",
  "topo-dark": "https://api.maptiler.com/maps/topo-v2-dark/{z}/{x}/{y}.png",
  outdoor: "https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png",
  "outdoor-dark": "https://api.maptiler.com/maps/outdoor-v2-dark/{z}/{x}/{y}.png",
};

export const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  streets: "Streets",
  "streets-dark": "Streets Dark",
  topo: "Topographic",
  "topo-dark": "Topographic (Dark)",
  outdoor: "Outdoor",
  "outdoor-dark": "Outdoor (Dark)",
};

const DARK_VARIANTS: Record<BaseMapStyle, MapStyle> = {
  streets: "streets-dark",
  topo: "topo-dark",
  outdoor: "outdoor-dark",
};

export function getMapStyleUrl(style: MapStyle, key: string): string {
  return `${MAP_STYLE_URLS[style]}?key=${key}`;
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isBaseStyle(style: string | null): style is BaseMapStyle {
  return style === "streets" || style === "topo" || style === "outdoor";
}

function isAnyMapStyle(style: string | null): style is MapStyle {
  return (
    style === "streets" ||
    style === "streets-dark" ||
    style === "topo" ||
    style === "topo-dark" ||
    style === "outdoor" ||
    style === "outdoor-dark"
  );
}

function resolveBaseStyle(
  stored: string | null,
  prefersDark: boolean
): BaseMapStyle {
  if (isBaseStyle(stored)) {
    return stored;
  }

  // Migrate older explicit dark selections to base style for auto-switching.
  if (stored === "streets-dark") return "streets";
  if (stored === "topo-dark") return "topo";
  if (stored === "outdoor-dark") return "outdoor";

  return prefersDark ? "streets" : "streets";
}

function toResolvedStyle(base: BaseMapStyle, prefersDark: boolean): MapStyle {
  return prefersDark ? DARK_VARIANTS[base] : base;
}

export function useMapStyle() {
  const [baseStyle, setBaseStyleState] = useState<BaseMapStyle>(() => {
    if (typeof window === "undefined") return "streets";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return resolveBaseStyle(stored, getSystemPrefersDark());
  });
  const [hasOverride, setHasOverride] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isAnyMapStyle(window.localStorage.getItem(STORAGE_KEY));
  });
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    getSystemPrefersDark()
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    setPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const style = useMemo(
    () => toResolvedStyle(baseStyle, prefersDark),
    [baseStyle, prefersDark]
  );

  const setStyle = (next: MapStyle | BaseMapStyle, override = true) => {
    const base: BaseMapStyle =
      next === "topo" || next === "topo-dark"
        ? "topo"
        : next === "outdoor" || next === "outdoor-dark"
          ? "outdoor"
          : "streets";

    setBaseStyleState(base);
    setHasOverride(override);

    if (typeof window === "undefined") return;

    if (override) {
      window.localStorage.setItem(STORAGE_KEY, base);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const resetToSystem = () => {
    setBaseStyleState(resolveBaseStyle(null, getSystemPrefersDark()));
    setHasOverride(false);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return { style, baseStyle, setStyle, hasOverride, resetToSystem };
}
