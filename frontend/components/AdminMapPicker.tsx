'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to handle map clicks
function LocationSelector({ setLocation }: { setLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Helper to pan the map
function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(position, { animate: true, duration: 1 });
  }, [map, position]);
  return null;
}

interface AdminMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export default function AdminMapPicker({ latitude, longitude, onChange }: AdminMapPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full bg-white/5 rounded-xl animate-pulse flex items-center justify-center border border-white/10">
        <span className="text-gray-500 font-medium">Loading Map Picker...</span>
      </div>
    );
  }

  // Default to somewhere near Bangalore or Delhi if not provided, just for initial view
  const defaultPos: [number, number] = [28.6139, 77.2090];
  const position: [number, number] = (latitude && longitude) ? [latitude, longitude] : defaultPos;

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-white/10 relative z-0 mt-2">
      <MapContainer 
        center={position} 
        zoom={latitude && longitude ? 15 : 4} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {latitude && longitude && <Marker position={position} />}
        <LocationSelector setLocation={onChange} />
        {latitude && longitude && <MapUpdater position={position} />}
      </MapContainer>
      <div className="absolute top-2 right-2 z-[1000] bg-black/80 px-2 py-1 rounded text-xs text-gray-300 pointer-events-none border border-white/10 backdrop-blur-md">
        Click map to set coordinates
      </div>
    </div>
  );
}
