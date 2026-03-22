/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import {
  AppEntryRoute,
  LandingRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from './components/RouteGuards';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SOSFeed from './pages/SOSFeed';
import TacticalMap from './pages/TacticalMap';
import Volunteers from './pages/Volunteers';

const Layout = () => {
  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base">
      <div className="pointer-events-none fixed inset-0 z-[200] scanning-line-blue opacity-[0.03]"></div>

      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="relative flex-1 overflow-y-auto bg-bg-base/50">
          <div className="pointer-events-none absolute inset-0 opacity-5">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            ></div>
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [null, `${Math.random() * 100}%`],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: Math.random() * 20 + 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute h-1 w-1 rounded-full bg-brand-secondary blur-[1px]"
              />
            ))}
          </div>

          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const AnimatedDashboardRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

const VolunteersRoute = () => {
  const { session } = useApp();

  if (session?.role === 'volunteer') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Volunteers />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AppEntryRoute />} />

      <Route element={<LandingRoute />}>
        <Route path="/landing" element={<LandingPage />} />
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<AnimatedDashboardRoutes />}>
            <Route path="/dashboard" element={<SOSFeed />} />
            <Route path="/map" element={<TacticalMap />} />
            <Route path="/volunteers" element={<VolunteersRoute />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </Router>
  );
}
