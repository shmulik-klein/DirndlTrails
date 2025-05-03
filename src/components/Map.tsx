import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Map = ({ hikes }: { hikes: { name: string; position: [number, number] }[] }) => {
  const defaultCenter: [number, number] = [48.778, 11.431]; // Center of Bavaria

  useEffect(() => {
    // Any map-related initialization can go here
  }, []);

  return (
    <MapContainer center={defaultCenter} zoom={8} style={{ height: '100vh', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {hikes.map((hike, index) => (
        <Marker key={index} position={hike.position}>
          <Popup>{hike.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;