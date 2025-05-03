import hikes from "@/data/hikes.json";

import dynamic from "next/dynamic";

const Map = dynamic(
  () => {
    return import("@/components/Map");
  },
  { ssr: false }
);

export default function Home() {
  return (
    <div>
      <h1>DirndlTrails</h1>
      <Map hikes={hikes} />
    </div>
  );
}
