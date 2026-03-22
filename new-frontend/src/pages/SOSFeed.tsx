import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  Phone,
  MapPin,
  ChevronRight,
  Search,
  Activity,
  Zap,
  ShieldAlert,
  User,
  Play,
  FileText,
  BrainCircuit,
  ArrowRight,
  Plus,
  X,
  Send,
  UserPlus,
  Shield,
  AlertTriangle,
  Bot,
  CheckCheck,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import type { SOSRequest } from '../types';
import { maskPhoneInLabel } from '../utils/maskPhone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SOS_TYPES = ['Medical', 'Fire', 'Accident', 'Crime', 'Disaster', 'Other'];
const VERDICTS = ['completed', 'fake'];

/* ── Confidence Bar (from ML scores) ── */
const ConfidenceBar = ({ value }: { value: number }) => {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-brand-primary';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
};

/* ── Priority badge mapping ── */
const priorityStyle = (p: string) => {
  switch (p) {
    case 'Critical': return 'bg-brand-primary/20 text-brand-primary';
    case 'High': return 'bg-orange-400/20 text-orange-400';
    case 'Medium': return 'bg-brand-warning/20 text-brand-warning';
    case 'Low': return 'bg-brand-accent/20 text-brand-accent';
    default: return 'bg-brand-warning/20 text-brand-warning';
  }
};

const statusStyle = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-brand-warning/20 text-brand-warning';
    case 'assigned': return 'bg-brand-secondary/20 text-brand-secondary';
    case 'volunteer_completed': case 'completed': return 'bg-brand-accent/20 text-brand-accent';
    case 'volunteer_fake': case 'fake': return 'bg-brand-primary/20 text-brand-primary';
    default: return 'bg-white/10 text-text-secondary';
  }
};

/** Returns true if this request was auto-assigned, with a heuristic fallback for older records. */
function isAutoAssigned(req: SOSRequest): boolean {
  if (typeof req.autoAssigned === 'boolean') {
    return req.status === 'assigned' && !!req.assignedVolunteer?.name && req.autoAssigned;
  }

  return (
    req.status === 'assigned' &&
    !!req.assignedVolunteer?.name &&
    !req.blockchain?.assignedLogged
  );
}

/** Checks if today (UTC date string). */
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const SOSFeed = () => {
  const {
    session, requests, myRequests, volunteerRequests,
    loading, error, refresh,
    createSOS, assign, volunteerReport, adminFinalize, web3,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<SOSRequest | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: session?.name || '', message: '', type: 'Medical' });
  const [msg, setMsg] = useState('');

  /* Per-request drafts */
  const [assignDrafts, setAssignDrafts] = useState<Record<string, { volunteerName: string; volunteerWallet: string }>>({});
  const [volunteerNotes, setVolunteerNotes] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  /* Which list to show based on role */
  const displayList = useMemo(() => {
    let list: SOSRequest[];
    if (session?.role === 'user') list = myRequests;
    else if (session?.role === 'volunteer') list = volunteerRequests;
    else list = requests; // admin sees all

    if (filter !== 'All') {
      list = list.filter((r) => r.priority === filter);
    }
    return list;
  }, [session, requests, myRequests, volunteerRequests, filter]);

  /* ── Stats ── */
  const autoAssignedToday = useMemo(
    () => requests.filter((r) => isAutoAssigned(r) && isToday(r.createdAt)).length,
    [requests],
  );
  const pendingManual = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );

  const stats = useMemo(() => [
    { label: 'Total', value: String(requests.length), icon: Activity, color: 'text-brand-secondary' },
    { label: 'Critical', value: String(requests.filter((r) => r.priority === 'Critical').length), icon: ShieldAlert, color: 'text-brand-primary' },
    { label: 'Auto Assigned', value: String(autoAssignedToday), icon: Bot, color: 'text-green-400' },
    { label: 'Pending Manual', value: String(pendingManual), icon: Clock, color: 'text-brand-warning' },
  ], [requests, autoAssignedToday, pendingManual]);

  /* ── Handlers ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createSOS(createForm);
      setMsg(result);
      setCreateForm({ name: session?.name || '', message: '', type: 'Medical' });
      setShowCreateModal(false);
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to create SOS.');
    }
  };

  const handleAssign = async (id: string) => {
    try {
      const draft = assignDrafts[id];
      if (!draft?.volunteerName || !draft?.volunteerWallet) {
        setMsg('Enter volunteer name and wallet.');
        return;
      }
      await assign(id, draft.volunteerName, draft.volunteerWallet);
      setMsg('Volunteer assigned.');
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to assign.');
    }
  };

  const handleVolunteerReport = async (id: string, status: string) => {
    try {
      await volunteerReport(id, status, volunteerNotes[id] || '');
      setMsg('Report submitted.');
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to report.');
    }
  };

  const handleAdminFinalize = async (id: string, status: string) => {
    try {
      await adminFinalize(id, status, adminNotes[id] || '');
      setMsg('Finalized.');
    } catch (err: any) {
      setMsg(err?.response?.data?.message || 'Failed to finalize.');
    }
  };

  /* Re-sync selected request when list refreshes */
  const activeSelected = selectedRequest
    ? requests.find((r) => r._id === selectedRequest._id) || selectedRequest
    : null;

  return (
    <div className="p-8 space-y-8 relative overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-[200] glass-panel p-4 rounded-sm border-brand-accent/30 flex items-center gap-3 max-w-md"
          >
            <p className="text-xs">{msg}</p>
            <button onClick={() => setMsg('')} className="text-text-tertiary hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight">
              {session?.role === 'user' ? 'My SOS Requests' : session?.role === 'volunteer' ? 'Assigned Tasks' : 'All SOS Requests'}
            </h2>
            <div className="flex items-center gap-2 px-2 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-sm">
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest">
                {loading ? 'Syncing...' : 'Live'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-bg-elevated border border-white/5 rounded-sm p-1">
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all",
                    filter === f ? "bg-white/10 text-white" : "text-text-secondary hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={refresh} className="btn-tactical btn-secondary px-3 py-1.5 text-xs">
              <Activity className="w-3 h-3" />
              <span>Refresh</span>
            </button>
            {session?.role === 'user' && (
              <button onClick={() => setShowCreateModal(true)} className="btn-tactical btn-primary px-3 py-1.5 text-xs">
                <Plus className="w-3 h-3" />
                <span>New SOS</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="glass-panel p-4 rounded-sm border-brand-primary/20 text-xs text-brand-primary">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {displayList.length === 0 && (
            <div className="glass-panel p-12 rounded-sm text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-text-tertiary mx-auto" />
              <p className="text-sm font-bold">No requests found</p>
              <p className="text-xs text-text-secondary">
                {session?.role === 'user' ? 'Submit an SOS to get started.' : 'No matching requests.'}
              </p>
            </div>
          )}

          {displayList.map((req, i) => (
            <motion.div
              key={req._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "glass-panel p-4 rounded-sm cursor-pointer hover:border-white/20 transition-all group relative overflow-hidden",
                req.priority === 'Critical' ? "border-l-2 border-l-brand-primary" : "border-l-2 border-l-white/5"
              )}
            >
              {req.priority === 'Critical' && (
                <div className="absolute inset-0 bg-brand-primary/5 animate-pulse-soft pointer-events-none"></div>
              )}

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6 flex-1 min-w-0" onClick={() => setSelectedRequest(req)}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">ID</span>
                    <span className="text-xs font-bold font-mono">#{req.sequenceId}</span>
                  </div>

                  <div className="h-10 w-px bg-white/5 shrink-0"></div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-sm font-bold tracking-tight group-hover:text-brand-primary transition-colors truncate">
                        {maskPhoneInLabel(req.name)} — {req.type}
                      </h4>
                      <span className={cn("status-badge", priorityStyle(req.priority))}>
                        {req.priority}
                      </span>
                      <span className={cn("status-badge", statusStyle(req.status))}>
                        {req.status}
                      </span>
                      {/* Auto-assigned badge on the card row */}
                      {isAutoAssigned(req) && (
                        <span className="status-badge bg-green-500/20 text-green-400 flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" />
                          Auto Assigned
                        </span>
                      )}
                      {req.suspicious && (
                        <span className="status-badge bg-brand-primary/20 text-brand-primary">
                          ⚠ Suspicious
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-text-secondary font-mono uppercase tracking-widest">
                      {req.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{req.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(req.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {req.keywords?.slice(0, 3).map((kw, ki) => (
                    <span key={ki} className="px-2 py-0.5 text-[8px] font-mono bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 rounded-sm uppercase tracking-widest">
                      {kw}
                    </span>
                  ))}
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-sm transition-colors shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Admin Controls ── */}
              {session?.role === 'admin' && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 xl:grid-cols-2 gap-4 relative z-10">

                  {/* Assign column: conditional on auto-assignment status */}
                  <div className="space-y-2 rounded-sm border border-white/5 bg-bg-elevated/35 p-3">
                    {isAutoAssigned(req) ? (
                      /* ── Auto-Assigned Display ── */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Bot className="w-3 h-3 text-green-400" />
                          <p className="text-[10px] font-mono text-green-400 uppercase tracking-widest font-bold">
                            Auto Assigned
                          </p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-sm px-3 py-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-green-400" />
                            <span className="text-xs font-bold text-green-300">
                              {req.assignedVolunteer?.name}
                            </span>
                          </div>
                          {req.assignedVolunteer?.distanceKm != null && (
                            <div className="flex items-center gap-2">
                              <Navigation className="w-3 h-3 text-green-400/70" />
                              <span className="text-[10px] text-green-400/70 font-mono">
                                {req.assignedVolunteer.distanceKm.toFixed(1)} km away
                              </span>
                            </div>
                          )}
                          {req.assignedVolunteer?.wallet && (
                            <p className="text-[9px] font-mono text-text-tertiary truncate">
                              {req.assignedVolunteer.wallet.slice(0, 8)}…{req.assignedVolunteer.wallet.slice(-6)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : req.status === 'pending' ? (
                      /* ── No volunteer available — manual fallback ── */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-brand-primary" />
                          <p className="text-[10px] font-mono text-brand-primary uppercase tracking-widest">
                            No Volunteers Nearby
                          </p>
                        </div>
                        <p className="text-[9px] text-text-tertiary">Auto-assignment failed. Assign manually:</p>
                        <input
                          className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-brand-primary/50"
                          placeholder="Volunteer name"
                          value={assignDrafts[req._id]?.volunteerName || ''}
                          onChange={(e) => setAssignDrafts((c) => ({ ...c, [req._id]: { ...(c[req._id] || { volunteerName: '', volunteerWallet: '' }), volunteerName: e.target.value } }))}
                        />
                        <input
                          className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-primary/50"
                          placeholder="Volunteer wallet 0x..."
                          value={assignDrafts[req._id]?.volunteerWallet || ''}
                          onChange={(e) => setAssignDrafts((c) => ({ ...c, [req._id]: { ...(c[req._id] || { volunteerName: '', volunteerWallet: '' }), volunteerWallet: e.target.value } }))}
                        />
                        <button onClick={() => handleAssign(req._id)} className="btn-tactical btn-secondary text-[10px] px-3 py-1.5 justify-center">
                          <UserPlus className="w-3 h-3" />
                          <span>Assign Manually</span>
                        </button>
                      </div>
                    ) : (
                      /* ── Manual assign (assigned via old blockchain flow or already assigned manually) ── */
                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
                          {req.assignedVolunteer?.name ? 'Manually Assigned' : 'Assign Volunteer'}
                        </p>
                        {req.assignedVolunteer?.name && (
                          <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-sm px-3 py-2">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-brand-secondary" />
                              <span className="text-xs font-bold text-brand-secondary">
                                {req.assignedVolunteer.name}
                              </span>
                            </div>
                          </div>
                        )}
                        <input
                          className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-brand-primary/50"
                          placeholder="Volunteer name"
                          value={assignDrafts[req._id]?.volunteerName || req.assignedVolunteer?.name || ''}
                          onChange={(e) => setAssignDrafts((c) => ({ ...c, [req._id]: { ...(c[req._id] || { volunteerName: '', volunteerWallet: '' }), volunteerName: e.target.value } }))}
                        />
                        <input
                          className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-primary/50"
                          placeholder="Volunteer wallet 0x..."
                          value={assignDrafts[req._id]?.volunteerWallet || req.assignedVolunteer?.wallet || ''}
                          onChange={(e) => setAssignDrafts((c) => ({ ...c, [req._id]: { ...(c[req._id] || { volunteerName: '', volunteerWallet: '' }), volunteerWallet: e.target.value } }))}
                        />
                        <button onClick={() => handleAssign(req._id)} className="btn-tactical btn-secondary text-[10px] px-3 py-1.5 justify-center">
                          <UserPlus className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Finalize column — unchanged */}
                  <div className="space-y-2 rounded-sm border border-white/5 bg-bg-elevated/35 p-3">
                    <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Admin Finalize</p>
                    <textarea
                      className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs min-h-[60px] resize-none focus:outline-none focus:border-brand-primary/50"
                      placeholder="Admin note..."
                      value={adminNotes[req._id] || ''}
                      onChange={(e) => setAdminNotes((c) => ({ ...c, [req._id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {VERDICTS.map((v) => (
                        <button
                          key={v}
                          onClick={() => handleAdminFinalize(req._id, v)}
                          disabled={!req.volunteerVerification?.status || req.finalStatus !== 'pending'}
                          className="btn-tactical btn-primary text-[10px] px-3 py-1.5 justify-center disabled:opacity-30"
                        >
                          <span>Finalize {v}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {session?.role === 'volunteer' && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 relative z-10 rounded-sm border border-white/5 bg-bg-elevated/35 p-3">
                  <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Volunteer Report</p>
                  <textarea
                    className="w-full bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs min-h-[48px] resize-none focus:outline-none focus:border-brand-primary/50"
                    placeholder="Your field notes..."
                    value={volunteerNotes[req._id] || ''}
                    onChange={(e) => setVolunteerNotes((c) => ({ ...c, [req._id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {VERDICTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => handleVolunteerReport(req._id, v)}
                        disabled={Boolean(req.volunteerVerification?.status) || req.finalStatus !== 'pending'}
                        className="btn-tactical btn-secondary text-[10px] px-3 py-1.5 justify-center disabled:opacity-30"
                      >
                        <span>Mark {v}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Create SOS Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-8"
            >
              <div className="bg-bg-surface border border-white/10 p-8 rounded-sm w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 scanning-line opacity-5 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-sm flex items-center justify-center">
                        <ShieldAlert className="text-brand-primary w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight">Create SOS</h3>
                        <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Emergency Request</p>
                      </div>
                    </div>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/5 rounded-sm">
                      <X className="w-4 h-4 text-text-tertiary" />
                    </button>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Name</label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                        required
                        className="w-full bg-bg-elevated border border-white/5 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Emergency Type</label>
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm((c) => ({ ...c, type: e.target.value }))}
                        className="w-full bg-bg-elevated border border-white/5 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary/50"
                      >
                        {SOS_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Description</label>
                      <textarea
                        value={createForm.message}
                        onChange={(e) => setCreateForm((c) => ({ ...c, message: e.target.value }))}
                        required
                        placeholder="Describe the emergency..."
                        className="w-full bg-bg-elevated border border-white/5 rounded-sm px-4 py-2.5 text-sm min-h-[100px] resize-none focus:outline-none focus:border-brand-primary/50"
                      />
                    </div>
                    <button type="submit" className="w-full btn-tactical btn-primary justify-center py-3">
                      <Send className="w-4 h-4" />
                      <span>Send SOS</span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Detail Slide-over ── */}
      <AnimatePresence>
        {activeSelected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-[520px] bg-bg-surface border-l border-white/10 z-[101] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="absolute inset-0 scanning-line opacity-10 pointer-events-none"></div>

              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-sm flex items-center justify-center">
                    <ShieldAlert className="text-brand-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">SOS #{activeSelected.sequenceId}</h3>
                    <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">{maskPhoneInLabel(activeSelected.name)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-white/5 rounded-sm transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn("status-badge", statusStyle(activeSelected.status))}>{activeSelected.status}</span>
                  <span className={cn("status-badge", priorityStyle(activeSelected.priority))}>{activeSelected.priority}</span>
                  <span className="status-badge bg-brand-secondary/20 text-brand-secondary">{activeSelected.type}</span>
                  {isAutoAssigned(activeSelected) && (
                    <span className="status-badge bg-green-500/20 text-green-400 flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" />
                      Auto Assigned
                    </span>
                  )}
                  {activeSelected.suspicious && (
                    <span className="status-badge bg-brand-primary/20 text-brand-primary">⚠ Suspicious</span>
                  )}
                </div>

                {/* Location */}
                {activeSelected.location && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <MapPin className="w-3 h-3" />
                    <span>{activeSelected.location}</span>
                  </div>
                )}

                {/* Message */}
                <div className="glass-panel p-4 rounded-sm">
                  <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Emergency Description</p>
                  <p className="text-xs leading-relaxed text-text-secondary">{activeSelected.message}</p>
                </div>

                {/* Keywords */}
                {activeSelected.keywords && activeSelected.keywords.length > 0 && (
                  <div>
                    <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Detected Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeSelected.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-mono bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 rounded-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ML Scores Panel */}
                {activeSelected.mlScores && activeSelected.mlScores.confidence != null ? (
                  <div className="glass-panel p-4 rounded-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-brand-secondary" />
                      <p className="text-[10px] font-mono text-brand-secondary uppercase tracking-widest font-bold">ML Model Scores</p>
                    </div>

                    <div>
                      <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Confidence</p>
                      <ConfidenceBar value={activeSelected.mlScores.confidence} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="glass-panel p-2 rounded-sm">
                        <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-1">ML Category</p>
                        <p className="text-xs font-bold capitalize">{activeSelected.mlScores.mlCategory || '—'}</p>
                      </div>
                      <div className="glass-panel p-2 rounded-sm">
                        <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-1">ML Priority</p>
                        <p className="text-xs font-bold capitalize">{activeSelected.mlScores.mlPriority || '—'}</p>
                      </div>
                      <div className="glass-panel p-2 rounded-sm">
                        <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-1">Gemini Hint</p>
                        <p className="text-xs font-bold capitalize text-text-secondary">{activeSelected.mlScores.geminiCategoryHint || '—'}</p>
                      </div>
                    </div>

                    {activeSelected.mlScores.categoryProbability && Object.keys(activeSelected.mlScores.categoryProbability).length > 0 && (
                      <div>
                        <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Category Probabilities</p>
                        <div className="space-y-1">
                          {Object.entries(activeSelected.mlScores.categoryProbability)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([key, prob]) => (
                              <div key={key} className="flex items-center gap-2 text-[10px]">
                                <span className="w-16 truncate text-text-tertiary capitalize font-mono">{key}</span>
                                <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                                  <div className="h-full rounded-full bg-brand-secondary/50" style={{ width: `${Math.round((prob as number) * 100)}%` }} />
                                </div>
                                <span className="w-8 text-right tabular-nums text-text-tertiary font-mono">{((prob as number) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {activeSelected.mlScores.priorityProbability && Object.keys(activeSelected.mlScores.priorityProbability).length > 0 && (
                      <div>
                        <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Priority Probabilities</p>
                        <div className="space-y-1">
                          {Object.entries(activeSelected.mlScores.priorityProbability)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([key, prob]) => (
                              <div key={key} className="flex items-center gap-2 text-[10px]">
                                <span className="w-16 truncate text-text-tertiary capitalize font-mono">{key}</span>
                                <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                                  <div className="h-full rounded-full bg-brand-accent/50" style={{ width: `${Math.round((prob as number) * 100)}%` }} />
                                </div>
                                <span className="w-8 text-right tabular-nums text-text-tertiary font-mono">{((prob as number) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeSelected.analysisSummary ? (
                  <div className="glass-panel p-4 rounded-sm">
                    <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">AI Analysis</p>
                    <p className="text-xs text-text-secondary whitespace-pre-wrap">{activeSelected.analysisSummary}</p>
                  </div>
                ) : null}

                {/* Assignment & verification info */}
                <div className="glass-panel p-4 rounded-sm space-y-2 text-xs">
                  <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Status Tracker</p>

                  {/* Auto-assign highlight in detail panel */}
                  {isAutoAssigned(activeSelected) && (
                    <div className="flex items-center gap-2 py-1.5 px-2 bg-green-500/10 border border-green-500/20 rounded-sm mb-2">
                      <Bot className="w-3 h-3 text-green-400 shrink-0" />
                      <span className="text-[10px] text-green-400 font-mono font-bold uppercase tracking-widest">
                        Auto-Assignment — Nearest Available Volunteer
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-text-tertiary">Volunteer:</span> <span className="font-bold">{activeSelected.assignedVolunteer?.name || 'Not assigned'}</span></div>
                    <div><span className="text-text-tertiary">Wallet:</span> <span className="font-mono">{activeSelected.assignedVolunteer?.wallet ? `${activeSelected.assignedVolunteer.wallet.slice(0, 6)}...${activeSelected.assignedVolunteer.wallet.slice(-4)}` : '—'}</span></div>
                    {activeSelected.assignedVolunteer?.distanceKm != null && (
                      <div className="col-span-2 flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-green-400" />
                        <span className="text-text-tertiary">Distance:</span>
                        <span className="font-bold text-green-400">{activeSelected.assignedVolunteer.distanceKm.toFixed(1)} km away</span>
                      </div>
                    )}
                    <div><span className="text-text-tertiary">Vol. report:</span> <span className="font-bold">{activeSelected.volunteerVerification?.status || 'waiting'}</span></div>
                    <div><span className="text-text-tertiary">Admin final:</span> <span className="font-bold">{activeSelected.adminVerification?.status || 'waiting'}</span></div>
                    <div className="col-span-2"><span className="text-text-tertiary">Final result:</span> <span className="font-bold">{activeSelected.finalStatus || 'pending'}</span></div>
                  </div>
                </div>

                {/* Blockchain info */}
                {activeSelected.blockchain && (
                  <div className="glass-panel p-4 rounded-sm space-y-2 text-xs">
                    <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mb-2">Blockchain Proof</p>
                    {(['createdTxHash', 'assignedTxHash', 'volunteerReportedTxHash', 'completedTxHash'] as const).map((key) => {
                      const val = activeSelected.blockchain?.[key];
                      const label = key.replace('TxHash', '').replace(/([A-Z])/g, ' $1').trim();
                      return (
                        <div key={key} className="flex justify-between">
                          <span className="text-text-tertiary capitalize">{label} tx:</span>
                          <span className="font-mono">{val ? `${val.slice(0, 6)}...${val.slice(-4)}` : 'pending'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SOSFeed;
