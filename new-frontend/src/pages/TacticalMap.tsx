import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Filter,
  Layers,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { SOSIncident, SOSRequest, Volunteer } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MapDashboard from '../components/MapDashboard';
import { fetchAssignmentDetails } from '../api';
import { useApp } from '../context/AppContext';
import { maskPhoneInLabel } from '../utils/maskPhone';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LatLng = [number, number];

interface BackendCoordinates {
  lat: number | null;
  lng: number | null;
}

interface AssignmentDetails {
  complaint: {
    id: string;
    location: string;
    coordinates?: BackendCoordinates | null;
  };
  assignedVolunteer: {
    id?: string;
    name: string;
    wallet?: string;
    location?: string;
    coordinates?: BackendCoordinates | null;
    distanceFromSOS?: string | null;
  } | null;
  autoAssigned: boolean;
  assignedAt: string | null;
}

const ACTIVE_ASSIGNMENT_STATUSES = new Set(['assigned', 'volunteer_completed', 'volunteer_fake']);

const toLatLng = (coordinates?: BackendCoordinates | null): LatLng | null => {
  if (coordinates?.lat == null || coordinates?.lng == null) {
    return null;
  }

  return [coordinates.lat, coordinates.lng];
};

const buildSampleVolunteerCoord = ([lat, lng]: LatLng): LatLng => [
  Number((lat + 0.012).toFixed(6)),
  Number((lng - 0.016).toFixed(6)),
];

const buildSampleRoute = ([startLat, startLng]: LatLng, [endLat, endLng]: LatLng): LatLng[] => {
  const midLat = Number((((startLat + endLat) / 2) + 0.01).toFixed(6));
  const midLng = Number((((startLng + endLng) / 2) - 0.008).toFixed(6));

  return [
    [startLat, startLng],
    [midLat, midLng],
    [endLat, endLng],
  ];
};

const toIncident = (req: SOSRequest): SOSIncident => ({
  id: req._id,
  title: `${maskPhoneInLabel(req.name)} — ${req.type}`,
  location: req.location || 'Unknown',
  coordinates:
    req.coordinates?.lat != null && req.coordinates?.lng != null
      ? [req.coordinates.lat, req.coordinates.lng]
      : undefined,
  timestamp: req.createdAt,
  priority: req.priority === 'Critical' || req.priority === 'High' ? 'Critical' : 'Moderate',
  status: req.finalStatus === 'completed' ? 'Resolved' : 'Active',
  description: req.message,
  callerName: maskPhoneInLabel(req.name),
  callerPhone: '',
});

const buildVolunteerMarker = (
  request: SOSRequest,
  details: AssignmentDetails | null,
  coordinate: LatLng,
  estimated: boolean,
): Volunteer => ({
  id: details?.assignedVolunteer?.id || request.assignedVolunteer?.wallet || `vol-${request._id}`,
  name: details?.assignedVolunteer?.name || request.assignedVolunteer?.name || 'Assigned Volunteer',
  role: estimated ? 'Estimated Position' : 'Assigned Responder',
  status: 'Active',
  location:
    details?.assignedVolunteer?.location ||
    (estimated ? 'Estimated response position' : 'Volunteer position'),
  coordinates: coordinate,
  rating: 0,
  completedMissions: 0,
  joinDate: '',
});

const TacticalMap = () => {
  const { requests, volunteerRequests, session } = useApp();

  const visibleRequests = useMemo(
    () => (session?.role === 'volunteer' ? volunteerRequests : requests),
    [requests, session, volunteerRequests],
  );

  const assignedRequests = useMemo(
    () =>
      visibleRequests.filter(
        (req) =>
          ACTIVE_ASSIGNMENT_STATUSES.has(req.status) &&
          !!req.assignedVolunteer?.wallet &&
          req.coordinates?.lat != null &&
          req.coordinates?.lng != null,
      ),
    [visibleRequests],
  );

  const incidents = useMemo(() => assignedRequests.map(toIncident), [assignedRequests]);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetails | null>(null);
  const [mapIncidents, setMapIncidents] = useState<SOSIncident[]>([]);
  const [mapVolunteers, setMapVolunteers] = useState<Volunteer[]>([]);
  const [drawnRoute, setDrawnRoute] = useState<LatLng[] | null>(null);
  const [routeMode, setRouteMode] = useState<'live' | 'sample' | 'none'>('none');
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (incidents.length === 0) {
      setSelectedIncident(null);
      setSelectedAssignment(null);
      setMapIncidents([]);
      setMapVolunteers([]);
      setDrawnRoute(null);
      setRouteMode('none');
      setMapError('');
      return;
    }

    if (!selectedIncident || !incidents.some((incident) => incident.id === selectedIncident)) {
      setSelectedIncident(incidents[0].id);
    }
  }, [incidents, selectedIncident]);

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }

    const incident = incidents.find((item) => item.id === selectedIncident);
    const request = assignedRequests.find((item) => item._id === selectedIncident);

    if (!incident || !request?.coordinates) {
      return;
    }

    let cancelled = false;

    const loadAssignmentMap = async () => {
      setLoadingMap(true);
      setMapError('');
      setSelectedAssignment(null);

      const requestSosCoord = toLatLng(request.coordinates);
      setMapIncidents(requestSosCoord ? [{ ...incident, coordinates: requestSosCoord }] : []);
      setMapVolunteers([]);
      setDrawnRoute(null);
      setRouteMode('none');

      try {
        const details = (await fetchAssignmentDetails(selectedIncident)) as AssignmentDetails;
        if (cancelled) {
          return;
        }

        const sosCoord = toLatLng(details.complaint.coordinates) || requestSosCoord || incident.coordinates || null;
        const liveVolunteerCoord = toLatLng(details.assignedVolunteer?.coordinates);
        const volunteerCoord =
          liveVolunteerCoord || (sosCoord ? buildSampleVolunteerCoord(sosCoord) : null);
        const estimatedVolunteer = !liveVolunteerCoord && !!volunteerCoord;
        const hasVolunteerIdentity = !!(details.assignedVolunteer || request.assignedVolunteer);

        setSelectedAssignment(details);
        setMapIncidents(sosCoord ? [{ ...incident, coordinates: sosCoord }] : []);
        setMapVolunteers(
          hasVolunteerIdentity && volunteerCoord
            ? [buildVolunteerMarker(request, details, volunteerCoord, estimatedVolunteer)]
            : [],
        );
        setDrawnRoute(sosCoord && volunteerCoord ? buildSampleRoute(volunteerCoord, sosCoord) : null);
        setRouteMode(volunteerCoord ? (estimatedVolunteer ? 'sample' : 'live') : 'none');
      } catch (error) {
        if (cancelled) {
          return;
        }

        const sosCoord = requestSosCoord || incident.coordinates || null;
        const volunteerCoord = sosCoord ? buildSampleVolunteerCoord(sosCoord) : null;

        setSelectedAssignment(null);
        setMapIncidents(sosCoord ? [{ ...incident, coordinates: sosCoord }] : []);
        setMapVolunteers(
          volunteerCoord
            ? [buildVolunteerMarker(request, null, volunteerCoord, true)]
            : [],
        );
        setDrawnRoute(sosCoord && volunteerCoord ? buildSampleRoute(volunteerCoord, sosCoord) : null);
        setRouteMode(volunteerCoord ? 'sample' : 'none');
        setMapError('Live volunteer coordinates were unavailable, so the map is showing an estimated response path.');
        console.error('Failed to load assignment details for tactical map:', error);
      } finally {
        if (!cancelled) {
          setLoadingMap(false);
        }
      }
    };

    void loadAssignmentMap();

    return () => {
      cancelled = true;
    };
  }, [assignedRequests, incidents, selectedIncident]);

  const selectedRequest = useMemo(
    () => assignedRequests.find((req) => req._id === selectedIncident) || null,
    [assignedRequests, selectedIncident],
  );

  const stats = useMemo(
    () => [
      {
        label: session?.role === 'volunteer' ? 'My Routes' : 'Assigned SOS',
        value: String(assignedRequests.length),
        icon: ShieldAlert,
        color: 'text-brand-primary',
      },
      {
        label: 'Auto Assigned',
        value: String(assignedRequests.filter((req) => req.autoAssigned).length),
        icon: Activity,
        color: 'text-brand-accent',
      },
      {
        label: 'Volunteer Ready',
        value: String(assignedRequests.filter((req) => req.assignedVolunteer?.wallet).length),
        icon: Users,
        color: 'text-brand-secondary',
      },
    ],
    [assignedRequests, session],
  );

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      <div className="w-80 border-r border-white/5 bg-bg-surface flex flex-col z-10">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
              {session?.role === 'volunteer' ? 'My Assigned Route' : 'Assigned Response Map'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">Linked</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-sm border border-white/5 bg-bg-elevated/60 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <stat.icon className={cn('w-3 h-3', stat.color)} />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary">
                    {stat.label}
                  </span>
                </div>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                {session?.role === 'volunteer' ? 'My Assigned SOS' : 'Assigned SOS'}
              </h4>
              <span className="text-[10px] font-mono text-brand-primary font-bold">{assignedRequests.length}</span>
            </div>

            <div className="space-y-2">
              {assignedRequests.length === 0 && (
                <div className="rounded-sm border border-white/5 bg-bg-elevated/50 p-4 text-[11px] text-text-secondary">
                  No assigned SOS with coordinates is available yet.
                </div>
              )}

              {incidents.map((incident) => {
                const request = assignedRequests.find((item) => item._id === incident.id);

                return (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident.id)}
                    className={cn(
                      'w-full p-3 rounded-sm border border-white/5 hover:bg-white/5 transition-all text-left',
                      selectedIncident === incident.id ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-bg-elevated/50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                          <h5 className="text-[11px] font-bold tracking-tight truncate">{incident.title}</h5>
                        </div>
                        <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest">
                          {incident.location}
                        </p>
                        <p className="text-[9px] text-text-tertiary">
                          Volunteer: {request?.assignedVolunteer?.name || 'Assigned'}
                        </p>
                      </div>
                      <span className="text-[8px] font-mono text-text-tertiary">#{request?.sequenceId}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Selected Link</h4>

            {selectedRequest ? (
              <div className="space-y-3 rounded-sm border border-white/5 bg-bg-elevated/60 p-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand-primary">
                    SOS Caller Position
                  </p>
                  <p className="text-sm font-bold">{maskPhoneInLabel(selectedRequest.name)}</p>
                  <p className="text-[10px] text-text-secondary">{selectedRequest.location || 'Unknown location'}</p>
                </div>

                <div className="h-px bg-white/5"></div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-brand-accent">
                    Volunteer Position
                  </p>
                  <p className="text-sm font-bold">
                    {selectedAssignment?.assignedVolunteer?.name || selectedRequest.assignedVolunteer?.name || 'Assigned volunteer'}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    {selectedAssignment?.assignedVolunteer?.location ||
                      (routeMode === 'sample' ? 'Estimated response position' : 'Volunteer position')}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-sm border border-white/5 bg-black/20 px-3 py-2">
                  <RouteIcon className="w-3 h-3 text-brand-secondary" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                    {loadingMap
                      ? 'Linking positions...'
                      : routeMode === 'live'
                        ? 'Two live markers with sample response path'
                        : routeMode === 'sample'
                          ? 'Two markers with estimated volunteer path'
                          : 'Waiting for route data'}
                  </span>
                </div>

                {mapError && (
                  <div className="flex items-start gap-2 rounded-sm border border-brand-warning/30 bg-brand-warning/10 px-3 py-2">
                    <AlertTriangle className="w-3 h-3 text-brand-warning mt-0.5 shrink-0" />
                    <p className="text-[10px] leading-relaxed text-brand-warning">{mapError}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-sm border border-white/5 bg-bg-elevated/50 p-4 text-[11px] text-text-secondary">
                Select an assigned SOS to render the caller and volunteer markers.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-2">
          <button className="btn-tactical btn-secondary justify-center text-[10px] py-1.5">
            <Layers className="w-3 h-3" />
            <span>Markers</span>
          </button>
          <button className="btn-tactical btn-secondary justify-center text-[10px] py-1.5">
            <Filter className="w-3 h-3" />
            <span>Routes</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-bg-base overflow-hidden">
        <MapDashboard
          incidents={mapIncidents}
          volunteers={mapVolunteers}
          selectedIncident={selectedIncident}
          drawnRoute={drawnRoute}
        />

        <div className="absolute top-8 right-8 glass-panel p-4 rounded-sm space-y-4 w-72 z-[1000] bg-black/80 border border-white/10 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Map Pairing</h4>
            <Navigation className="w-3 h-3 text-brand-accent" />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-6 h-6 rounded-sm bg-brand-primary/10 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-brand-primary" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">SOS Marker</p>
                <p className="text-xs font-bold">{selectedRequest ? maskPhoneInLabel(selectedRequest.name) : 'Waiting for selection'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-6 h-6 rounded-sm bg-brand-accent/10 flex items-center justify-center">
                <Users className="w-3 h-3 text-brand-accent" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Volunteer Marker</p>
                <p className="text-xs font-bold">
                  {selectedAssignment?.assignedVolunteer?.name || selectedRequest?.assignedVolunteer?.name || 'Awaiting assignment'}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5"></div>

          <div className="space-y-2">
            <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest">Route Mode</p>
            <div className="rounded-sm border border-white/5 bg-bg-elevated/50 px-3 py-2">
              <p className="text-[11px] font-semibold">
                {loadingMap
                  ? 'Loading assignment geometry'
                  : routeMode === 'live'
                    ? 'Volunteer location found'
                    : routeMode === 'sample'
                      ? 'Sample volunteer route rendered'
                      : 'No pair selected'}
              </p>
              <p className="text-[10px] text-text-secondary mt-1">
                {routeMode === 'live'
                  ? 'The map is using the SOS and registered volunteer coordinates.'
                  : routeMode === 'sample'
                    ? 'The volunteer marker is estimated so the SOS still renders with a usable path.'
                    : 'Select an assigned SOS to show both markers.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticalMap;
