import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Plus,
  MoreVertical,
  ChevronRight,
  ShieldCheck,
  Activity,
  UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExtractedVolunteer {
  name: string;
  wallet: string;
  assignedCount: number;
  completedCount: number;
  status: 'Active' | 'On-Call' | 'Offline';
}

const Volunteers = () => {
  const { requests } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'On-Call' | 'Offline'>('All');

  /* Extract unique volunteers from real SOS data */
  const volunteers = useMemo<ExtractedVolunteer[]>(() => {
    const map = new Map<string, ExtractedVolunteer>();
    for (const req of requests) {
      const vol = req.assignedVolunteer;
      if (!vol?.wallet) continue;
      const key = vol.wallet.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.assignedCount++;
        if (req.finalStatus === 'completed') existing.completedCount++;
      } else {
        map.set(key, {
          name: vol.name,
          wallet: vol.wallet,
          assignedCount: 1,
          completedCount: req.finalStatus === 'completed' ? 1 : 0,
          status: 'Active',
        });
      }
    }
    return Array.from(map.values());
  }, [requests]);

  const filteredVolunteers = volunteers.filter(vol => {
    const matchesSearch = vol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vol.wallet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' ? true : vol.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = [
    { label: 'Total Volunteers', value: String(volunteers.length), icon: Users, color: 'text-brand-secondary' },
    { label: 'Active Now', value: String(volunteers.filter(v => v.status === 'Active').length), icon: Activity, color: 'text-brand-accent' },
    { label: 'Total Assignments', value: String(volunteers.reduce((sum, v) => sum + v.assignedCount, 0)), icon: Clock, color: 'text-brand-warning' },
    { label: 'Completed', value: String(volunteers.reduce((sum, v) => sum + v.completedCount, 0)), icon: ShieldCheck, color: 'text-brand-primary' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Volunteer Registry</h2>
          <p className="text-xs text-text-secondary font-mono uppercase tracking-widest">Community Response Network Management</p>
        </div>
        <button className="btn-tactical btn-primary">
          <UserPlus className="w-4 h-4" />
          <span>Register New Volunteer</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon className={cn("w-12 h-12", stat.color)} />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name or wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-elevated border border-white/5 rounded-sm pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-bg-elevated border border-white/5 rounded-sm p-1">
            {['All', 'Active', 'On-Call', 'Offline'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all",
                  filter === f ? "bg-white/10 text-white" : "text-text-secondary hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="btn-tactical btn-secondary">
            <Filter className="w-3 h-3" />
            <span>Advanced Filters</span>
          </button>
        </div>
      </div>

      {/* Volunteers Table */}
      <div className="glass-panel rounded-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Volunteer</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Status</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Wallet</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Assignments</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Completed</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredVolunteers.map((vol, i) => (
              <motion.tr
                key={vol.wallet}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <td className="p-4 relative">
                  {vol.status === 'Active' && (
                    <div className="absolute inset-0 bg-brand-accent/5 animate-pulse-soft pointer-events-none"></div>
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-sm bg-bg-elevated border border-white/10 flex items-center justify-center overflow-hidden">
                      <Users className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight group-hover:text-brand-primary transition-colors">{vol.name}</p>
                      <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Responder</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "status-badge",
                      vol.status === 'Active' ? "bg-brand-accent/20 text-brand-accent" :
                        vol.status === 'On-Call' ? "bg-brand-warning/20 text-brand-warning" : "bg-text-tertiary/20 text-text-tertiary"
                    )}>
                      {vol.status}
                    </span>
                    {vol.status === 'Active' && (
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-xs font-mono text-text-secondary">
                    {vol.wallet.slice(0, 6)}...{vol.wallet.slice(-4)}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-mono font-bold">{vol.assignedCount}</span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-mono font-bold">{vol.completedCount}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-sm transition-colors">
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-sm transition-colors">
                      <MoreVertical className="w-4 h-4 text-text-tertiary" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredVolunteers.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-text-tertiary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">No volunteers found</p>
              <p className="text-xs text-text-secondary">Volunteers appear here once assigned to SOS requests</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Volunteers;
