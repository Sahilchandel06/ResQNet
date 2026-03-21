import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  ArrowUpRight,
  Clock,
  Vote,
  TrendingUp,
  Activity,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  BarChart3,
  Search,
  FileText,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_PROPOSALS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchOnChainSOS, fetchReputation } from '../api';
import type { OnChainProof, ReputationData } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Governance = () => {
  /* On-chain proof lookup */
  const [proofId, setProofId] = useState('');
  const [proof, setProof] = useState<OnChainProof | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  /* Reputation lookup */
  const [repWallet, setRepWallet] = useState('');
  const [rep, setRep] = useState<ReputationData | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  const handleLookupProof = async () => {
    if (!proofId) return;
    setProofLoading(true);
    try {
      const data = await fetchOnChainSOS(Number(proofId));
      setProof(data);
    } catch {
      setProof({ sos: null, message: 'Lookup failed.' });
    }
    setProofLoading(false);
  };

  const handleLookupRep = async () => {
    if (!repWallet) return;
    setRepLoading(true);
    try {
      const data = await fetchReputation(repWallet);
      setRep(data);
    } catch {
      setRep({ available: false, reputation: '0', rewardAmountWei: null, message: 'Lookup failed.' });
    }
    setRepLoading(false);
  };

  const stats = [
    { label: 'Active Proposals', value: '4', icon: Activity, color: 'text-brand-secondary' },
    { label: 'Your Voting Power', value: '12.4k', icon: Vote, color: 'text-brand-primary' },
    { label: 'Governance Health', value: '98.2%', icon: ShieldCheck, color: 'text-brand-accent' },
    { label: 'Total RESQ Staked', value: '4.2M', icon: TrendingUp, color: 'text-brand-warning' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Community Governance</h2>
          <p className="text-xs text-text-secondary font-mono uppercase tracking-widest">Decentralized Emergency Protocol Management</p>
        </div>
        <button className="btn-tactical btn-primary">
          <Plus className="w-4 h-4" />
          <span>New Proposal</span>
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

      <div className="grid grid-cols-3 gap-8">
        {/* Active Proposals */}
        <div className="col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Active Proposals</h3>
            <button className="text-[10px] font-mono text-brand-secondary hover:underline">View All</button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {MOCK_PROPOSALS.filter(p => p.status === 'Active').map((proposal, i) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel p-6 rounded-sm space-y-6 hover:border-brand-secondary/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 scanning-line opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"></div>
                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-brand-secondary/10 border border-brand-secondary/20 rounded-sm">
                          <span className="w-1 h-1 bg-brand-secondary rounded-full animate-pulse"></span>
                          <span className="text-[8px] font-mono font-bold text-brand-secondary uppercase tracking-widest">Active</span>
                        </div>
                        <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">ID: {proposal.id}</span>
                      </div>
                      <h4 className="text-lg font-bold tracking-tight group-hover:text-brand-secondary transition-colors">{proposal.title}</h4>
                      <p className="text-xs text-text-secondary leading-relaxed max-w-xl">{proposal.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-brand-warning">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{proposal.timeLeft} left</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">By {proposal.author}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-accent font-bold">For: {proposal.votesFor.toLocaleString()}</span>
                        <span className="text-text-tertiary">({((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-tertiary">({((proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(1)}%)</span>
                        <span className="text-brand-primary font-bold">Against: {proposal.votesAgainst.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-brand-accent"
                        style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                      ></div>
                      <div
                        className="h-full bg-brand-primary"
                        style={{ width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <button className="btn-tactical btn-secondary text-[10px] px-3 py-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="btn-tactical bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border border-brand-primary/20 text-[10px] px-4 py-1">
                        Vote Against
                      </button>
                      <button className="btn-tactical bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 border border-brand-accent/20 text-[10px] px-4 py-1">
                        Vote For
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* On-Chain Proof Lookup (NEW from Group A) */}
          <div className="glass-panel p-6 rounded-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-secondary" />
              <h4 className="text-sm font-bold tracking-tight">On-Chain Proof</h4>
            </div>
            <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Verify SOS record on blockchain</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={proofId}
                onChange={(e) => setProofId(e.target.value)}
                placeholder="SOS Sequence ID"
                className="flex-1 bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-brand-primary/50"
              />
              <button onClick={handleLookupProof} disabled={proofLoading} className="btn-tactical btn-secondary text-[10px] px-3 py-1.5">
                <Search className="w-3 h-3" />
                <span>{proofLoading ? '...' : 'Verify'}</span>
              </button>
            </div>
            {proof && (
              <div className="text-xs space-y-1 pt-2 border-t border-white/5">
                {proof.sos ? (
                  <>
                    <div className="flex justify-between"><span className="text-text-tertiary">Reporter:</span><span className="font-bold">{proof.sos.reporterName}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary">Type:</span><span>{proof.sos.emergencyType}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary">Priority:</span><span>{proof.sos.priority}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary">Status:</span><span>{proof.sos.status}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary">Volunteer:</span><span>{proof.sos.volunteerName || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary">Reward:</span><span>{proof.sos.rewardPaidWei || '0'} wei</span></div>
                  </>
                ) : (
                  <p className="text-text-tertiary">{proof.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Reputation Lookup (NEW from Group A) */}
          <div className="glass-panel p-6 rounded-sm space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand-accent" />
              <h4 className="text-sm font-bold tracking-tight">Reputation Check</h4>
            </div>
            <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Query wallet reputation</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={repWallet}
                onChange={(e) => setRepWallet(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-bg-elevated border border-white/5 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-primary/50"
              />
              <button onClick={handleLookupRep} disabled={repLoading} className="btn-tactical btn-secondary text-[10px] px-3 py-1.5">
                <Search className="w-3 h-3" />
                <span>{repLoading ? '...' : 'Lookup'}</span>
              </button>
            </div>
            {rep && (
              <div className="text-xs space-y-1 pt-2 border-t border-white/5">
                <div className="flex justify-between"><span className="text-text-tertiary">Reputation:</span><span className="font-bold">{rep.reputation}</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Reward Amount:</span><span>{rep.rewardAmountWei || '—'} wei</span></div>
                <p className="text-text-tertiary pt-1">{rep.message}</p>
              </div>
            )}
          </div>

          {/* Past Proposals (Group B — untouched) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Past Proposals</h3>
            <div className="space-y-3">
              {MOCK_PROPOSALS.filter(p => p.status !== 'Active').map((proposal, i) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: -4 }}
                  className="glass-panel p-4 rounded-sm space-y-3 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "status-badge",
                      proposal.status === 'Passed' ? "bg-brand-accent/20 text-brand-accent" : "bg-brand-primary/20 text-brand-primary"
                    )}>
                      {proposal.status}
                    </span>
                    <span className="text-[8px] font-mono text-text-tertiary">{proposal.id}</span>
                  </div>
                  <h5 className="text-xs font-bold tracking-tight">{proposal.title}</h5>
                  <div className="flex items-center justify-between text-[8px] font-mono text-text-tertiary uppercase tracking-widest">
                    <span>{proposal.category}</span>
                    <div className="flex items-center gap-1">
                      {proposal.status === 'Passed' ? <CheckCircle2 className="w-2 h-2 text-brand-accent" /> : <XCircle className="w-2 h-2 text-brand-primary" />}
                      <span>{proposal.status === 'Passed' ? 'Implemented' : 'Rejected'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Voting Power Info (Group B — untouched) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-panel p-6 rounded-sm space-y-4 bg-gradient-to-br from-brand-secondary/5 to-transparent relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-brand-secondary/5 animate-pulse-soft pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-brand-secondary/10 rounded-sm flex items-center justify-center">
                <Vote className="text-brand-secondary w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">Voting Power</h4>
                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">Calculated from RESQ Staked</p>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex justify-between text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
                <span>Staked Amount</span>
                <span className="text-white">12,450 RESQ</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
                <span>Multiplier</span>
                <span className="text-brand-accent">1.2x (Loyalty)</span>
              </div>
              <div className="h-px bg-white/5 my-2"></div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span>Total Power</span>
                <span className="text-brand-secondary">14,940 VP</span>
              </div>
            </div>

            <button className="w-full btn-tactical btn-secondary justify-center text-[10px] relative z-10">
              Stake More RESQ
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Governance;
