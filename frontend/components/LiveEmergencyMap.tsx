'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Emergency Icon
const createEmergencyIcon = (isLive: boolean) => {
  return L.divIcon({
    className: 'custom-emergency-marker bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-8 h-8">
             ${isLive ? '<span class="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-50 animate-ping"></span>' : ''}
             <span class="relative inline-flex rounded-full w-4 h-4 bg-red-600 border-2 border-white shadow-lg"></span>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface LiveEmergencyMapProps {
  latitude: number;
  longitude: number;
  status: 'LIVE' | 'LAST_KNOWN';
  timestamp: string;
}

// Helper to smoothly pan the map when coordinates change
function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(position, { animate: true, duration: 1 });
  }, [map, position]);
  return null;
}

export default function LiveEmergencyMap({ latitude, longitude, status, timestamp }: LiveEmergencyMapProps) {
  const [mounted, setMounted] = useState(false);
  const position: [number, number] = [latitude, longitude];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 sm:h-80 w-full bg-black/40 rounded-xl animate-pulse flex items-center justify-center border border-white/5">
        <span className="text-gray-500 font-medium">Loading Live Map...</span>
      </div>
    );
  }

  const isLive = status === 'LIVE';

  return (
    <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
      {/* We add global CSS overrides inline for the popup to match dark UI slightly better */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background-color: #1a1a1a;
          color: #f3f4f6;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
        }
        .leaflet-popup-tip {
          background-color: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .custom-emergency-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <MapContainer 
        center={position} 
        zoom={16} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        {/* Dark mode friendly map tiles (CartoDB Dark Matter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={position} icon={createEmergencyIcon(isLive)}>
          <Popup>
            <div className="text-center px-2 py-1 min-w-[120px]">
              <strong className="text-red-500 block text-base font-bold mb-1">Emergency User</strong>
              <span className="text-gray-300 text-sm block font-medium">{isLive ? 'Live Location' : 'Last Known Location'}</span>
              <span className="text-xs text-gray-500 mt-2 block">Last updated: {timestamp}</span>
            </div>
          </Popup>
        </Marker>
        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
}
