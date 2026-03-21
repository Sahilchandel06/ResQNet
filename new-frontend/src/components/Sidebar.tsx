import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Map as MapIcon,
  Settings,
  Activity,
  LogOut,
  Bell,
  Globe
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useApp } from '../context/AppContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sidebar = () => {
  const { logout } = useApp();

  const navItems = [
    { icon: LayoutDashboard, label: 'SOS Feed', path: '/' },
    { icon: MapIcon, label: 'Tactical Map', path: '/map' },
    { icon: Users, label: 'Volunteers', path: '/volunteers' },
    { icon: ShieldCheck, label: 'Governance', path: '/governance' },
    { icon: Globe, label: 'Public Site', path: '/landing' },
    { icon: Activity, label: 'System Health', path: '/health' },
  ];

  return (
    <aside className="w-64 h-screen border-r border-white/5 bg-bg-surface flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-primary rounded-sm flex items-center justify-center">
          <ShieldCheck className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight">RESQNET HQ</h1>
          <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Tactical Command</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all duration-200",
              isActive
                ? "bg-brand-primary/10 text-brand-primary border-r-2 border-brand-primary"
                : "text-text-secondary hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-3 py-2 text-text-secondary hover:text-white cursor-pointer transition-colors">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Settings</span>
        </div>
        <div
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-brand-primary hover:text-red-400 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
