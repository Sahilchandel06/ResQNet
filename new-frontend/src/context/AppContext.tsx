import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import type { SOSRequest, HealthData, Web3Status, Session, Role } from '../types';
import * as api from '../api';

/* ── Context shape ── */
interface AppState {
    /* session */
    session: Session | null;
    enter: (role: Role, name: string, wallet: string) => void;
    logout: () => void;
    connectWallet: () => Promise<void>;

    /* data */
    requests: SOSRequest[];
    health: HealthData | null;
    web3: Web3Status | null;
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;

    /* derived */
    myRequests: SOSRequest[];
    volunteerRequests: SOSRequest[];

    /* mutations */
    createSOS: (body: { name: string; message: string; type: string }) => Promise<string>;
    assign: (id: string, volunteerName: string, volunteerWallet: string) => Promise<void>;
    volunteerReport: (id: string, status: string, note: string) => Promise<void>;
    adminFinalize: (id: string, status: string, note: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = (): AppState => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be inside AppProvider');
    return ctx;
};

const STORAGE_KEY = 'resqnet-session';

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    /* ── Session ── */
    const [session, setSession] = useState<Session | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        else localStorage.removeItem(STORAGE_KEY);
    }, [session]);

    const enter = useCallback((role: Role, name: string, wallet: string) => {
        setSession({ role, name: name.trim(), wallet: wallet.trim() });
    }, []);

    const logout = useCallback(() => setSession(null), []);

    const connectWallet = useCallback(async () => {
        if (!(window as any).ethereum) return;
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setSession((prev) => (prev ? { ...prev, wallet: address } : prev));
    }, []);

    /* ── Backend data ── */
    const [requests, setRequests] = useState<SOSRequest[]>([]);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [web3, setWeb3] = useState<Web3Status | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [h, r, w] = await Promise.all([
                api.fetchHealth(),
                api.fetchAllSOS(),
                api.fetchWeb3Status(),
            ]);
            setHealth(h);
            setRequests(r);
            setWeb3(w);
        } catch {
            setError('Backend is not reachable.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    /* ── Derived lists ── */
    const myRequests = useMemo(() => {
        if (!session?.name) return [];
        return requests.filter((r) => r.name.toLowerCase() === session.name.toLowerCase());
    }, [requests, session]);

    const volunteerRequests = useMemo(() => {
        if (!session?.wallet) return [];
        return requests.filter(
            (r) => r.assignedVolunteer?.wallet?.toLowerCase() === session.wallet.toLowerCase(),
        );
    }, [requests, session]);

    /* ── Mutations ── */
    const createSOSAction = useCallback(
        async (body: { name: string; message: string; type: string }) => {
            const res = await api.createSOS({
                ...body,
                reporterWallet: session?.wallet || '',
            });
            await refresh();
            return res.message;
        },
        [session, refresh],
    );

    const assignAction = useCallback(
        async (id: string, volunteerName: string, volunteerWallet: string) => {
            await api.assignVolunteer(id, {
                volunteerName,
                volunteerWallet,
                assignedBy: session?.name || 'Admin',
            });
            await refresh();
        },
        [session, refresh],
    );

    const volunteerReportAction = useCallback(
        async (id: string, status: string, note: string) => {
            await api.volunteerConfirm(id, {
                status,
                note,
                volunteerWallet: session?.wallet || '',
            });
            await refresh();
        },
        [session, refresh],
    );

    const adminFinalizeAction = useCallback(
        async (id: string, status: string, note: string) => {
            await api.adminConfirm(id, {
                status,
                note,
                finalizedBy: session?.name || 'Admin',
            });
            await refresh();
        },
        [session, refresh],
    );

    const value: AppState = {
        session,
        enter,
        logout,
        connectWallet,
        requests,
        health,
        web3,
        loading,
        error,
        refresh,
        myRequests,
        volunteerRequests,
        createSOS: createSOSAction,
        assign: assignAction,
        volunteerReport: volunteerReportAction,
        adminFinalize: adminFinalizeAction,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
