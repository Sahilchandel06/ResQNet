import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SOSIncident, Volunteer } from '../types';
import { Maximize2, Minimize2, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

// Fix for default Leaflet icon not showing properly in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const criticalIcon = createCustomIcon('#ff3b3b'); // brand-primary
const moderateIcon = createCustomIcon('#ff9f0a'); // brand-warning
const volunteerIcon = createCustomIcon('#0a84ff'); // brand-accent

// Component to handle dynamic map zooming based on route or selected marker
const MapBoundsFitter = ({ route, selectedIncidentCoord }: { route: [number, number][] | null, selectedIncidentCoord: [number, number] | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (selectedIncidentCoord) {
      map.setView(selectedIncidentCoord, 14, { animate: true });
    }
  }, [route, selectedIncidentCoord, map]);
  
  return null;
};

interface MapDashboardProps {
  incidents: SOSIncident[];
  volunteers: Volunteer[];
  selectedIncident: string | null;
  drawnRoute: [number, number][] | null;
}

const MapDashboard: React.FC<MapDashboardProps> = ({ incidents, volunteers, selectedIncident, drawnRoute }) => {
  const defaultCenter: [number, number] = [21.5, 72.0]; // General center for Gujarat/Maharashtra
  
  const selectedIncidentData = incidents.find(inc => inc.id === selectedIncident);
  const selectedIncidentCoord = selectedIncidentData?.coordinates || null;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSRM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Dynamic bounds fitting */}
        <MapBoundsFitter route={drawnRoute} selectedIncidentCoord={selectedIncidentCoord} />

        {/* Incidents (Red/Orange dots) */}
        {incidents.map((incident) => {
          if (!incident.coordinates) return null;
          return (
            <Marker 
              key={incident.id} 
              position={incident.coordinates} 
              icon={incident.priority === 'Critical' ? criticalIcon : moderateIcon}
            >
              <Popup className="tactical-popup">
                <div className="p-1">
                  <p className="text-xs font-bold font-mono" style={{ color: incident.priority === 'Critical' ? '#ff3b3b' : '#ff9f0a' }}>
                    {incident.id} - {incident.priority}
                  </p>
                  <p className="text-sm font-semibold">{incident.title}</p>
                  <p className="text-xs text-gray-300">{incident.location}</p>
                  <p className="text-xs text-gray-400 mt-1">{incident.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Volunteers (Blue dots) */}
        {volunteers.map((vol) => {
          if (!vol.coordinates || vol.status !== 'Active') return null;
          return (
            <Marker 
              key={vol.id} 
              position={vol.coordinates} 
              icon={volunteerIcon}
            >
              <Popup className="tactical-popup">
                <div className="p-1">
                  <p className="text-xs font-bold font-mono text-blue-400">{vol.role}</p>
                  <p className="text-sm font-semibold">{vol.name}</p>
                  <p className="text-xs text-gray-300">{vol.location}</p>
                  <p className="text-xs text-gray-500 mt-1">Rating: {vol.rating} | Missions: {vol.completedMissions}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Drawn Route */}
        {drawnRoute && drawnRoute.length > 0 && (
          <Polyline 
            positions={drawnRoute} 
            color="#0a84ff" 
            weight={4} 
            dashArray="10, 10" 
            className="route-path"
          />
        )}
      </MapContainer>
      
      {/* Route Animation Style */}
      <style dangerouslySetInnerHTML={{__html: `
        .route-path {
          animation: dash 20s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        /* Style fixes to fit dark mode better */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #111;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}} />
    </div>
  );
};

export default MapDashboard;
