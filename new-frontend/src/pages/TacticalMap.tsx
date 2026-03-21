import React, { useState, useMemo } from 'react';
import {
  Layers,
  Navigation,
  ShieldAlert,
  Users,
  Activity,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { MOCK_VOLUNTEERS } from '../constants';
import { SOSIncident } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MapDashboard from '../components/MapDashboard';
import { geocodeAddress, getRoute } from '../utils/mapHelpers';
import { useApp } from '../context/AppContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TacticalMap = () => {
  const { requests } = useApp();

  /* Convert real SOS requests into SOSIncident shape for the map */
  const realIncidents = useMemo<SOSIncident[]>(() => {
    return requests.map((req) => ({
      id: req._id,
      title: `${req.name} — ${req.type}`,
      location: req.location || 'Unknown',
      timestamp: req.createdAt,
      priority: (req.priority === 'Critical' || req.priority === 'High') ? 'Critical' : 'Moderate' as any,
      status: req.status === 'pending' ? 'Active' : req.finalStatus === 'completed' ? 'Resolved' : 'Active' as any,
      description: req.message,
      callerName: req.name,
      callerPhone: '',
      // No coordinates from backend — will not render on map unless geocoded
      coordinates: undefined,
    }));
  }, [requests]);

  const [incidents, setIncidents] = useState<SOSIncident[]>(realIncidents.length > 0 ? realIncidents : []);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [drawnRoute, setDrawnRoute] = useState<[number, number][] | null>(null);

  // Modal for adding a new SOS test
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSosLocation, setNewSosLocation] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Merge real incidents when they change
  React.useEffect(() => {
    if (realIncidents.length > 0) {
      setIncidents((prev) => {
        // Keep any locally-added incidents (ones with coordinates) and add real ones
        const localOnly = prev.filter((p) => p.coordinates && !realIncidents.find((r) => r.id === p.id));
        return [...localOnly, ...realIncidents];
      });
    }
  }, [realIncidents]);

  const handleIncidentClick = async (incidentId: string) => {
    setSelectedIncident(incidentId);

    // Simulate finding the nearest active volunteer to get a route
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident || !incident.coordinates) {
      setDrawnRoute(null);
      return;
    }

    // Find closest volunteer (MOCK_VOLUNTEERS)
    const activeVols = MOCK_VOLUNTEERS.filter(v => v.status === 'Active' && v.coordinates);
    if (activeVols.length > 0) {
      // Just pick the first active volunteer for demo routing
      const vol = activeVols[0];
      if (vol.coordinates) {
        const route = await getRoute(vol.coordinates, incident.coordinates);
        setDrawnRoute(route);
      }
    }
  };

  const handleSimulateSOS = async () => {
    if (!newSosLocation) return;

    setIsGeocoding(true);
    const coords = await geocodeAddress(newSosLocation + ", Gujarat"); // Append state for better geocoding context in this demo
    setIsGeocoding(false);

    if (coords) {
      const newIncident: SOSIncident = {
        id: `SOS-${Math.floor(Math.random() * 10000)}`,
        title: 'New Emergency Call',
        location: newSosLocation,
        coordinates: coords,
        timestamp: new Date().toISOString(),
        priority: 'Critical',
        status: 'Active',
        description: 'Mock SOS Call generated via text input.',
        callerName: 'Test User',
        callerPhone: '123-456'
      };

      setIncidents(prev => [...prev, newIncident]);
      setShowAddModal(false);

      // Auto-select to map it and generate route
      handleIncidentClick(newIncident.id);
    } else {
      alert("Could not find location. Try a specific city like 'Ahmedabad' or 'Surat'.");
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 border-r border-white/5 bg-bg-surface flex flex-col z-10">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Situational Awareness</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search map entities..."
                className="w-full bg-bg-elevated border border-white/5 rounded-sm pl-9 pr-4 py-1.5 text-[10px] focus:outline-none focus:border-brand-primary/50 transition-all"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-primary/20 text-brand-primary border border-brand-primary/50 rounded-sm px-2 flex items-center justify-center hover:bg-brand-primary/40 transition-colors"
              title="Simulate SOS Request"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Active Incidents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Active Incidents</h4>
              <span className="text-[10px] font-mono text-brand-primary font-bold">{incidents.length}</span>
            </div>
            <div className="space-y-2">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => handleIncidentClick(incident.id)}
                  className={cn(
                    "p-3 rounded-sm border border-white/5 hover:bg-white/5 transition-all cursor-pointer group",
                    selectedIncident === incident.id ? "bg-brand-primary/5 border-brand-primary/20" : "bg-bg-elevated/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          incident.priority === 'Critical' ? "bg-brand-primary" : "bg-brand-warning"
                        )}></span>
                        <h5 className="text-[11px] font-bold tracking-tight group-hover:text-brand-primary transition-colors">{incident.title}</h5>
                      </div>
                      <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest">{incident.location}</p>
                    </div>
                    <span className="text-[8px] font-mono text-text-tertiary">{typeof incident.id === 'string' && incident.id.length > 8 ? incident.id.slice(-6) : incident.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Units */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Active Units</h4>
              <span className="text-[10px] font-mono text-brand-accent font-bold">
                {MOCK_VOLUNTEERS.filter(v => v.status === 'Active').length}
              </span>
            </div>
            <div className="space-y-2">
              {MOCK_VOLUNTEERS.filter(v => v.status === 'Active').map((vol) => (
                <div key={vol.id} className="p-3 rounded-sm border border-white/5 bg-bg-elevated/50 hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-sm bg-brand-accent/10 flex items-center justify-center">
                        <Users className="w-3 h-3 text-brand-accent" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-bold tracking-tight group-hover:text-brand-accent transition-colors">{vol.name}</h5>
                        <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest">{vol.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-2 h-2 text-brand-accent" />
                      <span className="text-[8px] font-mono text-brand-accent">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-2">
          <button className="btn-tactical btn-secondary justify-center text-[10px] py-1.5">
            <Layers className="w-3 h-3" />
            <span>Layers</span>
          </button>
          <button className="btn-tactical btn-secondary justify-center text-[10px] py-1.5">
            <Filter className="w-3 h-3" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Real Map Area */}
      <div className="flex-1 relative bg-bg-base overflow-hidden">
        <MapDashboard
          incidents={incidents}
          volunteers={MOCK_VOLUNTEERS}
          selectedIncident={selectedIncident}
          drawnRoute={drawnRoute}
        />

        {/* Tactical Info Overlay - Minimal version for real map overlap */}
        <div className="absolute top-8 right-8 glass-panel p-4 rounded-sm space-y-4 w-64 z-[1000] bg-black/80 border border-white/10 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Unit Intelligence</h4>
            <Activity className="w-3 h-3 text-brand-accent" />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                <span>Network Coverage</span>
                <span className="text-brand-accent">94%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent w-[94%]"></div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5"></div>

          {drawnRoute ? (
            <div className="space-y-2">
              <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest">Active Interception</p>
              <div className="bg-brand-primary/10 border border-brand-primary/20 p-2 rounded-sm">
                <p className="text-[10px] font-bold text-brand-primary">Routing Unit VOL-001</p>
                <p className="text-[8px] text-text-secondary">Live Tracking to {selectedIncident}</p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400">Select an incident to view dispatch route.</p>
          )}
        </div>
      </div>

      {/* Add SOS Modal Overlay */}
      {showAddModal && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-bg-surface border border-brand-primary/30 p-6 rounded-md w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-primary" />
                Simulate SOS Request
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Incoming Call Text / Location</label>
                <input
                  type="text"
                  value={newSosLocation}
                  onChange={(e) => setNewSosLocation(e.target.value)}
                  placeholder="e.g. Vadodara Railway Station"
                  className="w-full bg-black/50 border border-white/10 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-white/10 text-gray-300 text-xs rounded-sm hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSimulateSOS}
                  disabled={isGeocoding || !newSosLocation}
                  className="px-4 py-2 bg-brand-primary text-white text-xs rounded-sm font-bold flex items-center gap-2 hover:bg-brand-primary/80 disabled:opacity-50"
                >
                  {isGeocoding ? 'Mapping...' : 'Trigger SOS Route'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalMap;
