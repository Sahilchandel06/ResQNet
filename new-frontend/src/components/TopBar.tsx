import React from 'react';
import { Bell, Search, User, Shield, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TopBar = () => {
  const { session, health } = useApp();

  const dbConnected = health?.database?.connected ?? false;

  return (
    <header className="h-16 border-b border-white/5 bg-bg-surface/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search incidents, volunteers, or protocols..."
            className="bg-bg-elevated border border-white/5 rounded-sm pl-10 pr-4 py-1.5 text-xs w-80 focus:outline-none focus:border-brand-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-sm">
          <Zap className="w-3 h-3 text-brand-primary fill-brand-primary" />
          <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">Live Response Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-bg-elevated border border-white/5 rounded-sm">
          <Shield className={`w-3 h-3 ${dbConnected ? 'text-brand-accent' : 'text-brand-primary'}`} />
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
            {dbConnected ? 'Network Secure' : 'DB Offline'}
          </span>
        </div>

        <button className="p-2 hover:bg-white/5 rounded-full relative transition-colors">
          <Bell className="w-4 h-4 text-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-bg-surface"></span>
        </button>

        <div className="h-8 w-px bg-white/5 mx-2"></div>

        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
          <div className="text-right">
            <p className="text-xs font-medium group-hover:text-brand-primary transition-colors">
              {session?.name || 'Anonymous'}
            </p>
            <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">
              {session?.role || 'guest'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-sm bg-bg-elevated border border-white/10 flex items-center justify-center overflow-hidden">
            <User className="w-5 h-5 text-text-secondary" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
