import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import type { HealthData, Role, SOSRequest, Session, Web3Status } from '../types';
import * as api from '../api';

interface AppState {
  session: Session | null;
  authReady: boolean;
  enter: (role: Role, name: string, wallet: string) => void;
  logout: () => void;
  connectWallet: () => Promise<string>;
  requests: SOSRequest[];
  health: HealthData | null;
  web3: Web3Status | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  myRequests: SOSRequest[];
  volunteerRequests: SOSRequest[];
  createSOS: (body: { name: string; message: string; type: string }) => Promise<string>;
  assign: (id: string, volunteerName: string, volunteerWallet: string) => Promise<void>;
  volunteerReport: (id: string, status: string, note: string) => Promise<void>;
  adminFinalize: (id: string, status: string, note: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);
const STORAGE_KEY = 'resqnet-session';

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be inside AppProvider');
  }

  return ctx;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setSession(raw ? (JSON.parse(raw) as Session) : null);
    } catch {
      setSession(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [authReady, session]);

  const enter = useCallback((role: Role, name: string, wallet: string) => {
    setSession({
      role,
      name: name.trim(),
      wallet: wallet.trim(),
    });
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const connectWallet = useCallback(async () => {
    const ethereum = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum;
    if (!ethereum) {
      return '';
    }

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    setSession((prev) => (prev ? { ...prev, wallet: address } : prev));

    return address;
  }, []);

  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [web3, setWeb3] = useState<Web3Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [nextHealth, nextRequests, nextWeb3] = await Promise.all([
        api.fetchHealth(),
        api.fetchAllSOS(),
        api.fetchWeb3Status(),
      ]);

      setHealth(nextHealth);
      setRequests(nextRequests);
      setWeb3(nextWeb3);
    } catch {
      setError('Backend is not reachable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const myRequests = useMemo(() => {
    if (!session?.name) {
      return [];
    }

    return requests.filter((request) => request.name.toLowerCase() === session.name.toLowerCase());
  }, [requests, session]);

  const volunteerRequests = useMemo(() => {
    if (!session?.wallet) {
      return [];
    }

    return requests.filter(
      (request) => request.assignedVolunteer?.wallet?.toLowerCase() === session.wallet.toLowerCase(),
    );
  }, [requests, session]);

  const createSOSAction = useCallback(
    async (body: { name: string; message: string; type: string }) => {
      const res = await api.createSOS({
        ...body,
        reporterWallet: session?.wallet || '',
      });

      await refresh();
      return res.message;
    },
    [refresh, session],
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
    [refresh, session],
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
    [refresh, session],
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
    [refresh, session],
  );

  const value = useMemo<AppState>(
    () => ({
      session,
      authReady,
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
    }),
    [
      adminFinalizeAction,
      assignAction,
      authReady,
      connectWallet,
      createSOSAction,
      enter,
      error,
      health,
      loading,
      logout,
      myRequests,
      refresh,
      requests,
      session,
      volunteerReportAction,
      volunteerRequests,
      web3,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
