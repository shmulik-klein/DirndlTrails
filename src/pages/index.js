import Map from '@/components/Map';
import hikes from '@/data/hikes.json';

export default function Home() {
  return (
    <div>
      <h1>DirndlTrails</h1>
      <Map hikes={hikes} />
    </div>
  );
}