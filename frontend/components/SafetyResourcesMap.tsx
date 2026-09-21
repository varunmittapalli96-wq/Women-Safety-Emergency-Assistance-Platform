'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SafetyZone } from '@/lib/api';
import { Phone, MapPin, Navigation } from 'lucide-react';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const createUserIcon = () => {
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-6 h-6">
             <span class="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-50 animate-ping"></span>
             <span class="relative inline-flex rounded-full w-3 h-3 bg-blue-600 border border-white shadow-lg"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const getZoneColor = (type: string) => {
  switch (type) {
    case 'POLICE_STATION': return 'bg-blue-500';
    case 'HOSPITAL': return 'bg-emerald-500';
    case 'SAFE_ZONE': return 'bg-accent-500';
    case 'WOMEN_HELP_CENTER': return 'bg-purple-500';
    case 'SHELTER': return 'bg-amber-500';
    default: return 'bg-brand-500';
  }
};

const createZoneIcon = (type: string) => {
  const color = getZoneColor(type);
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-6 h-6">
             <span class="relative inline-flex rounded-full w-4 h-4 ${color} border-2 border-white shadow-lg"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Helper to smoothly pan the map
function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(position, { animate: true, duration: 1 });
  }, [map, position]);
  return null;
}

interface SafetyResourcesMapProps {
  userLatitude: number;
  userLongitude: number;
  resources: SafetyZone[];
}

export default function SafetyResourcesMap({ userLatitude, userLongitude, resources }: SafetyResourcesMapProps) {
  const [mounted, setMounted] = useState(false);
  const position: [number, number] = [userLatitude, userLongitude];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[400px] w-full bg-black/40 rounded-xl animate-pulse flex items-center justify-center border border-white/5">
        <span className="text-gray-500 font-medium">Loading Safety Map...</span>
      </div>
    );
  }

  return (
    <div className="h-[400px] sm:h-[500px] w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
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
      `}</style>
      
      <MapContainer 
        center={position} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        {/* User Marker */}
        <Marker position={position} icon={createUserIcon()}>
          <Popup>
            <div className="text-center">
              <strong className="text-blue-400 block">You are here</strong>
            </div>
          </Popup>
        </Marker>

        {/* Resources Markers */}
        {resources.map((res) => (
          <Marker 
            key={res._id} 
            position={[res.location.coordinates[1], res.location.coordinates[0]]} 
            icon={createZoneIcon(res.type)}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <strong className="text-white block text-sm font-bold mb-1">{res.name}</strong>
                <span className="text-xs text-brand-300 font-medium block mb-2">{res.type.replace(/_/g, ' ')}</span>
                
                {res.distanceMeters !== undefined && (
                  <span className="text-xs text-gray-400 block mb-1">
                    {(res.distanceMeters / 1000).toFixed(2)} km away
                  </span>
                )}
                
                {res.address && (
                  <span className="text-xs text-gray-400 flex items-start gap-1 mt-2">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    {res.address}
                  </span>
                )}
                
                {res.phone && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {res.phone}
                  </span>
                )}
                
                {res.operatingHours && (
                  <span className="text-xs text-gray-500 block mt-2">Hours: {res.operatingHours}</span>
                )}
                
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userLatitude},${userLongitude}&destination=${res.location.coordinates[1]},${res.location.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Navigation className="w-3 h-3" /> Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
}
