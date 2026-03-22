import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const HAS_VISITED_BEFORE_KEY = 'resqnet-has-visited-before';

const hasVisitedBefore = (): boolean => {
  try {
    return localStorage.getItem(HAS_VISITED_BEFORE_KEY) === 'true';
  } catch {
    return false;
  }
};

const markVisitedBefore = (): void => {
  try {
    localStorage.setItem(HAS_VISITED_BEFORE_KEY, 'true');
  } catch {
    // Ignore storage failures and fall back to current-session navigation only.
  }
};

const BootScreen = () => (
  <div className="min-h-screen bg-bg-base" />
);

export const AppEntryRoute = () => {
  const { session, authReady } = useApp();
  const visited = hasVisitedBefore();

  if (!authReady) {
    return <BootScreen />;
  }

  if (session) {
    if (!visited) {
      markVisitedBefore();
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={visited ? '/login' : '/landing'} replace />;
};

export const LandingRoute = () => {
  const { session, authReady } = useApp();
  const visited = hasVisitedBefore();

  useEffect(() => {
    if (!visited) {
      markVisitedBefore();
    }
  }, [visited]);

  if (!authReady) {
    return <BootScreen />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (visited) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { session, authReady } = useApp();

  if (!authReady) {
    return <BootScreen />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasVisitedBefore()) {
    return <Navigate to="/landing" replace />;
  }

  return <Outlet />;
};

export const ProtectedRoute = () => {
  const { session, authReady } = useApp();

  if (!authReady) {
    return <BootScreen />;
  }

  if (!session) {
    return <Navigate to={hasVisitedBefore() ? '/login' : '/landing'} replace />;
  }

  return <Outlet />;
};
