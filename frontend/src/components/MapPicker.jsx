import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ClickMarker = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
};

export default function MapPicker({ lat, lng, onPick, readOnly = false, height = '300px' }) {
  const center = lat && lng ? [lat, lng] : [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={lat ? 15 : 5} style={{ height, width: '100%' }} className="rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!readOnly && onPick && <ClickMarker onPick={onPick} />}
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
