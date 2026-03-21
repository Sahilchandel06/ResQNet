import axios from 'axios';
import type {
    SOSRequest,
    HealthData,
    Web3Status,
    OnChainProof,
    ReputationData,
} from './types';

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

const http = axios.create({ baseURL: BASE });

/* ── Health ── */
export const fetchHealth = () =>
    http.get<HealthData>('/api/health').then((r) => r.data);

/* ── SOS CRUD ── */
export const fetchAllSOS = () =>
    http.get<{ sosRequests: SOSRequest[] }>('/api/sos').then((r) => r.data.sosRequests);

export const createSOS = (body: {
    name: string;
    message: string;
    type: string;
    reporterWallet?: string;
}) => http.post<{ message: string; sos: SOSRequest }>('/api/sos', body).then((r) => r.data);

export const assignVolunteer = (
    id: string,
    body: { volunteerName: string; volunteerWallet: string; assignedBy: string },
) => http.put<{ message: string; sos: SOSRequest }>(`/api/sos/${id}/assign`, body).then((r) => r.data);

export const volunteerConfirm = (
    id: string,
    body: { status: string; note: string; volunteerWallet: string },
) =>
    http
        .put<{ message: string; sos: SOSRequest }>(`/api/sos/${id}/volunteer-confirm`, body)
        .then((r) => r.data);

export const adminConfirm = (
    id: string,
    body: { status: string; note: string; finalizedBy: string },
) =>
    http
        .put<{ message: string; sos: SOSRequest }>(`/api/sos/${id}/admin-confirm`, body)
        .then((r) => r.data);

/* ── Web3 ── */
export const fetchWeb3Status = () =>
    http.get<Web3Status>('/api/web3/status').then((r) => r.data);

export const fetchOnChainSOS = (id: number) =>
    http.get<OnChainProof>(`/api/web3/sos/${id}`).then((r) => r.data);

export const fetchReputation = (wallet: string) =>
    http.get<ReputationData>(`/api/web3/reputation/${wallet}`).then((r) => r.data);
/* ── Volunteers ── */
export const registerVolunteer = (body: {
    name: string;
    phone: string;
    location: string;
    wallet: string;
}) => http.post('/api/volunteers', body).then((r) => r.data);

export const fetchVolunteers = () =>
    http.get('/api/volunteers').then((r) => r.data.volunteers);

/* ── Assignment Details ── */
export const fetchAssignmentDetails = (id: string) =>
    http.get(`/api/sos/${id}/assignment`).then((r) => r.data);
