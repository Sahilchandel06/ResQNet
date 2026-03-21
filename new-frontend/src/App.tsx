/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SOSFeed from './pages/SOSFeed';
import Volunteers from './pages/Volunteers';
import Governance from './pages/Governance';
import TacticalMap from './pages/TacticalMap';
import LandingPage from './pages/LandingPage';
import SystemHealth from './pages/SystemHealth';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-bg-base overflow-hidden relative">
      {/* Global Scanning Line */}
      <div className="fixed inset-0 scanning-line-blue opacity-[0.03] pointer-events-none z-[200]"></div>

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-bg-base/50 relative">
          {/* Subtle background grid */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* Floating Background Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * 100 + "%",
                  y: Math.random() * 100 + "%",
                  opacity: 0
                }}
                animate={{
                  y: [null, Math.random() * 100 + "%"],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: Math.random() * 20 + 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute w-1 h-1 bg-brand-secondary rounded-full blur-[1px]"
              />
            ))}
          </div>

          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { session } = useApp();
  const isLandingPage = location.pathname === '/landing';

  /* Session gate: no session → force landing, has session on /landing → go to dashboard */
  if (!session && !isLandingPage) {
    return <Navigate to="/landing" replace />;
  }

  if (isLandingPage) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/landing" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<SOSFeed />} />
            <Route path="/volunteers" element={<Volunteers />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/map" element={<TacticalMap />} />
            <Route path="/health" element={<SystemHealth />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AnimatedRoutes />
      </AppProvider>
    </Router>
  );
}
