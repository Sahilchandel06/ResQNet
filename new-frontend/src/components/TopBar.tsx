import React from 'react';
import { Search, User, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TopBar = () => {
  const { session } = useApp();

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
