import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Map as MapIcon,
  LogOut,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useApp } from '../context/AppContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sidebar = () => {
  const { logout, session } = useApp();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'SOS Feed', path: '/dashboard' },
    { icon: MapIcon, label: 'Tactical Map', path: '/map' },
    ...(session?.role === 'volunteer' ? [] : [{ icon: Users, label: 'Volunteers', path: '/volunteers' }]),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/5 bg-bg-surface">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-primary">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-sm font-bold tracking-tight">RESQNET HQ</h1>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-all duration-200',
                isActive
                  ? 'border-r-2 border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-left text-brand-primary transition-colors hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
