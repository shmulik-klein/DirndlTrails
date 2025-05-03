import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
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

const Map = ({ hikes }: { hikes: { name: string; date: string; position: [number, number]; photos: string }[] }) => {
    const defaultCenter: [number, number] = [48.04872322130709, 11.507710066839964]; // Center of Pullach

    useEffect(() => {
        // Any map-related initialization can go here
    }, []);

    return (
        <MapContainer center={defaultCenter} zoom={10} style={{ height: '100vh', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {hikes.map((hike, index) => (
                <Marker key={index} position={hike.position}>
                    <Popup>{hike.name}, {hike.date} <br />
                        <a href={hike.photos}>Photos</a>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default Map;