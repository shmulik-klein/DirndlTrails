import type { Weather } from "@/lib/hikeSchema";

type Props = {
  weather: Weather;
  className?: string;
  title?: boolean;
};

export function WeatherIcon({ weather, className = "h-4 w-4", title = true }: Props) {
  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": title ? undefined : true,
    role: title ? "img" : undefined,
  };

  if (weather === "sunny") {
    return (
      <svg {...commonProps}>
        {title ? <title>Sunny</title> : null}
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }

  if (weather === "partly-cloudy") {
    return (
      <svg {...commonProps}>
        {title ? <title>Partly cloudy</title> : null}
        <path d="M12 2v1M12 21v1M4.22 4.22l.71.71M19.07 19.07l.71.71M2 12h1M21 12h1M4.22 19.78l.71-.71M19.07 4.93l.71-.71" />
        <path d="M16 16a4 4 0 1 0-7.9-1H8a3 3 0 1 0 0 6h8a4 4 0 0 0 0-5Z" />
      </svg>
    );
  }

  if (weather === "cloudy") {
    return (
      <svg {...commonProps}>
        {title ? <title>Cloudy</title> : null}
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z" />
      </svg>
    );
  }

  if (weather === "fog") {
    return (
      <svg {...commonProps}>
        {title ? <title>Fog</title> : null}
        <path d="M3 12h18M3 16h18M3 8h18" opacity={0.6} />
        <path d="M6 12h12M4 16h16M5 8h14" />
      </svg>
    );
  }

  if (weather === "drizzle") {
    return (
      <svg {...commonProps}>
        {title ? <title>Drizzle</title> : null}
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z" />
        <path d="M8 19v2M12 21v2M16 19v2" />
      </svg>
    );
  }

  if (weather === "rain") {
    return (
      <svg {...commonProps}>
        {title ? <title>Rain</title> : null}
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z" />
        <path d="M8 19v2M12 21v2M16 19v2" />
        <path d="M9 16v2M13 18v2M17 16v2" />
      </svg>
    );
  }

  if (weather === "snow") {
    return (
      <svg {...commonProps}>
        {title ? <title>Snow</title> : null}
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z" />
        <path d="M8 18h.01M12 18h.01M16 18h.01M9 20h.01M13 20h.01M15 20h.01" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      {title ? <title>Storm</title> : null}
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z" />
      <path d="M13 16l-2 4h3l-2 4" />
    </svg>
  );
}
