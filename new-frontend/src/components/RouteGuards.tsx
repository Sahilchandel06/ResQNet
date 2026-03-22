import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  hasLoggedInBefore,
  markVisitedBefore,
} from '../utils/navigationState';

const BootScreen = () => (
  <div className="min-h-screen bg-bg-base" />
);

export const AppEntryRoute = () => {
  const { session, authReady } = useApp();
  const loggedInBefore = hasLoggedInBefore();

  if (!authReady) {
    return <BootScreen />;
  }

  if (session) {
    markVisitedBefore();

    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={loggedInBefore ? '/login' : '/landing'} replace />;
};

export const LandingRoute = () => {
  const { session, authReady } = useApp();
  const loggedInBefore = hasLoggedInBefore();

  useEffect(() => {
    markVisitedBefore();
  }, []);

  if (!authReady) {
    return <BootScreen />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loggedInBefore) {
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

  return <Outlet />;
};

export const ProtectedRoute = () => {
  const { session, authReady } = useApp();
  const loggedInBefore = hasLoggedInBefore();

  if (!authReady) {
    return <BootScreen />;
  }

  if (!session) {
    return <Navigate to={loggedInBefore ? '/login' : '/landing'} replace />;
  }

  return <Outlet />;
};
