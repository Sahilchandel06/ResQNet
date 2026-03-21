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
  UserPlus,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { registerVolunteer, fetchVolunteers } from '../api';
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

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', location: '', wallet: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data from backend DB
  const [dbVolunteers, setDbVolunteers] = useState<any[]>([]);

  const loadVolunteers = async () => {
    try {
      const data = await fetchVolunteers();
      setDbVolunteers(data || []);
    } catch (err) {
      console.error('Failed to load DB volunteers', err);
    }
  };

  React.useEffect(() => {
    loadVolunteers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerVolunteer(formData);
      setIsRegisterOpen(false);
      setFormData({ name: '', phone: '', location: '', wallet: '' });
      await loadVolunteers(); // Refresh the list
      alert('Volunteer registered successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to register volunteer');
    } finally {
      setLoading(false);
    }
  };

  /* Combine DB volunteers with real SOS assignment stats */
  const volunteers = useMemo<ExtractedVolunteer[]>(() => {
    return dbVolunteers.map((dbVol) => {
      // Count assignments from real SOS data
      let assignedCount = 0;
      let completedCount = 0;

      for (const req of requests) {
        if (req.assignedVolunteer?.wallet?.toLowerCase() === dbVol.wallet.toLowerCase()) {
          assignedCount++;
          if (req.finalStatus === 'completed') completedCount++;
        }
      }

      return {
        name: dbVol.name,
        wallet: dbVol.wallet,
        assignedCount,
        completedCount,
        status: dbVol.isAvailable ? 'Active' : 'Offline',
      };
    });
  }, [dbVolunteers, requests]);

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
        <button className="btn-tactical btn-primary" onClick={() => setIsRegisterOpen(true)}>
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

      {/* Registration Modal */}
      <AnimatePresence>
        {isRegisterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsRegisterOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-primary border border-white/10 p-6 rounded-sm shadow-2xl z-50 overflow-hidden"
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />

              <div className="flex justify-between items-start mb-6 mt-2">
                <div>
                  <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-brand-primary" />
                    Register Volunteer
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 font-mono">Join the rapid response network</p>
                </div>
                <button onClick={() => setIsRegisterOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-brand-warning/10 border border-brand-warning/30 rounded-sm">
                  <p className="text-sm font-semibold text-brand-warning">Error</p>
                  <p className="text-xs text-brand-warning/80 mt-1 leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono tracking-widest text-text-secondary uppercase">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/50 transition-colors"
                    placeholder="e.g., Sarah Chen"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono tracking-widest text-text-secondary uppercase">Phone Number</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/50 transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono tracking-widest text-text-secondary uppercase">Rough Location</label>
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/50 transition-colors"
                    placeholder="e.g., Downtown Seattle"
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">We will automatically geocode this for assignments.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono tracking-widest text-text-secondary uppercase">Wallet Address</label>
                  <input
                    required
                    type="text"
                    value={formData.wallet}
                    onChange={e => setFormData({ ...formData, wallet: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/50 transition-colors font-mono"
                    placeholder="0x..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="flex-1 px-4 py-2 border border-white/10 hover:bg-white/5 disabled:opacity-50 text-sm font-semibold rounded-sm transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-semibold rounded-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Volunteers;
