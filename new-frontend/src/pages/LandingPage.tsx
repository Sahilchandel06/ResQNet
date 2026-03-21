import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Users,
  Globe,
  ArrowRight,
  Activity,
  ShieldAlert,
  BrainCircuit,
  Lock,
  ChevronRight,
  Play,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROLES: Role[] = ['user', 'admin', 'volunteer'];

const LandingPage = () => {
  const { enter, session, connectWallet } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('user');
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    enter(role, name, wallet);
    navigate('/');
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  const stats = [
    { label: 'Network Nodes', value: '4,210' },
    { label: 'Avg Response', value: '4.2m' },
    { label: 'Active Volunteers', value: '12.4k' },
    { label: 'Successful Rescues', value: '89k+' },
  ];

  const features = [
    {
      title: 'AI-Driven Triage',
      description: 'Real-time audio analysis and situational awareness for instant priority assignment.',
      icon: BrainCircuit,
      color: 'text-brand-secondary'
    },
    {
      title: 'Community DAO',
      description: 'Decentralized governance for emergency protocols and resource allocation.',
      icon: Globe,
      color: 'text-brand-accent'
    },
    {
      title: 'Tactical Command',
      description: 'High-precision situational awareness and unit coordination for rapid response.',
      icon: ShieldCheck,
      color: 'text-brand-primary'
    }
  ];

  // Floating particles for background
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-screen bg-bg-base text-text-primary overflow-x-hidden">
      {/* Background Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Global Scanning Line */}
        <div className="absolute inset-0 scanning-line-blue opacity-[0.03] z-10"></div>

        {/* Large Blue Glows */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-secondary/20 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-brand-secondary/20 blur-[120px] rounded-full"
        />

        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: `${p.x}%`, y: `${p.y}%` }}
            animate={{
              opacity: [0, 0.3, 0],
              y: [`${p.y}%`, `${p.y - 20}%`],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear"
            }}
            className="absolute bg-brand-secondary rounded-full blur-[1px]"
            style={{ width: p.size, height: p.size }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="h-20 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-bg-base/80 backdrop-blur-md z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-brand-primary rounded-sm flex items-center justify-center">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">RESQNET</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-8"
        >
          <div className="hidden md:flex items-center gap-6">
            {['Features', 'Network', 'Governance'].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="text-sm text-text-secondary hover:text-white transition-colors"
              >
                {item}
              </motion.a>
            ))}
          </div>
          {session ? (
            <Link to="/" className="btn-tactical btn-primary">
              <span>Enter HQ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <a href="#access" className="btn-tactical btn-primary">
              <span>Launch HQ</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-12 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center space-y-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/20 border border-brand-primary/40 rounded-full relative group"
              style={{
                boxShadow: '0 0 15px rgba(255, 59, 48, 0.4), inset 0 0 10px rgba(255, 59, 48, 0.2)'
              }}
            >
              <div className="absolute inset-0 rounded-full bg-brand-primary/20 blur-md animate-pulse pointer-events-none"></div>
              <Zap className="w-4 h-4 text-brand-primary fill-brand-primary animate-pulse relative z-10" />
              <span className="text-xs font-mono font-bold text-brand-primary uppercase tracking-widest relative z-10">Version 2.4 Live Now</span>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="block"
              >
                Emergency Response
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-text-secondary block"
              >
                for the Real World.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
            >
              ResQNet is a decentralized tactical command system that leverages AI and community governance to provide rapid, reliable emergency assistance.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col md:flex-row items-center justify-center gap-6"
          >
            {session ? (
              <Link to="/" className="btn-tactical btn-primary px-8 py-4 text-lg group overflow-hidden relative">
                <span className="relative z-10">Enter Command Center</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <a href="#access" className="btn-tactical btn-primary px-8 py-4 text-lg group overflow-hidden relative">
                <span className="relative z-10">Enter Command Center</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </a>
            )}
            <button className="btn-tactical btn-secondary px-8 py-4 text-lg hover:bg-white/5 transition-all">
              <Play className="w-5 h-5 fill-white" />
              <span>Watch Protocol</span>
            </button>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-20">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 + (i * 0.1) }}
                className="space-y-1"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 1 + (i * 0.1), duration: 1 }}
                  className="text-3xl font-bold tracking-tight"
                >
                  {stat.value}
                </motion.p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Access Portal — session entry form */}
      <section id="access" className="py-20 px-12 relative z-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8 rounded-sm space-y-6 border-white/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 scanning-line opacity-5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">Access Portal</h3>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Authenticate to Command Center</p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="btn-tactical btn-secondary text-[10px] px-3 py-1.5"
                >
                  <Wallet className="w-3 h-3" />
                  <span>Connect Wallet</span>
                </button>
              </div>

              <form onSubmit={handleEnter} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Role</label>
                  <div className="flex items-center bg-bg-elevated border border-white/5 rounded-sm p-1">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-all text-center",
                          role === r ? "bg-brand-primary/20 text-brand-primary font-bold" : "text-text-secondary hover:text-white"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your callsign..."
                    required
                    className="w-full bg-bg-elevated border border-white/5 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>

                {role === 'volunteer' && (
                  <div>
                    <label className="block text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1.5">Wallet Address</label>
                    <input
                      type="text"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-bg-elevated border border-white/5 rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary/50 transition-all font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full btn-tactical btn-primary justify-center py-3 text-sm"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-12 bg-bg-surface/30 relative overflow-hidden">
        <div className="absolute inset-0 scanning-line opacity-20"></div>
        <div className="max-w-6xl mx-auto space-y-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl font-bold tracking-tight">Operational Protocol</h2>
            <p className="text-text-secondary font-mono uppercase tracking-widest text-xs">Built for Speed, Accuracy, and Resilience</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -10 }}
                className="glass-panel p-8 rounded-sm space-y-6 hover:border-white/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
                <div className={cn("w-12 h-12 rounded-sm bg-bg-elevated flex items-center justify-center group-hover:scale-110 transition-transform relative z-10", feature.color)}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="space-y-3 relative z-10">
                  <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
                <button className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-tertiary group-hover:text-white transition-colors relative z-10">
                  <span>Learn More</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-32 px-12 overflow-hidden relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Core System Architecture</h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                Our infrastructure is designed to survive the most extreme conditions, ensuring that help is always just a node away.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Decentralized Node Network', icon: Globe },
                { label: 'Encrypted Tactical Communication', icon: Lock },
                { label: 'Real-time Situational Awareness', icon: Activity },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 * i }}
                  className="flex items-center gap-4 p-4 glass-panel rounded-sm hover:bg-white/5 transition-colors group"
                >
                  <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center group-hover:bg-brand-secondary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-brand-secondary" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-brand-primary/10 blur-[100px] rounded-full animate-pulse-soft"></div>
            <div className="glass-panel p-8 rounded-sm relative z-10 border-white/10 overflow-hidden">
              <div className="absolute inset-0 scanning-line opacity-10"></div>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-brand-primary animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">Active Incident</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-tertiary">#SOS-8821</span>
                </div>
                <div className="h-px bg-white/5"></div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">AI Analysis</p>
                    <div className="p-3 bg-white/5 rounded-sm border border-white/5 italic text-xs text-text-secondary">
                      "Cardiac arrest confirmed via audio triage. Dispatching nearest ALS unit."
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-mono uppercase tracking-widest">Unit Intercepting</span>
                    </div>
                    <span className="text-xs font-bold">VOL-001 (EMT-B)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-12 border-t border-white/5 relative bg-bg-base">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-8 h-8 bg-brand-primary rounded-sm flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg tracking-tight">RESQNET</h1>
            </div>
            <p className="text-xs text-text-tertiary max-w-xs leading-relaxed">
              Empowering communities to respond to emergencies through technology and collective action.
            </p>
          </div>

          <div className="flex items-center gap-8">
            {['Documentation', 'Privacy Protocol', 'Network Status'].map((item) => (
              <a key={item} href="#" className="text-xs text-text-tertiary hover:text-white transition-colors">{item}</a>
            ))}
          </div>

          <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
            © 2026 ResQNet Foundation. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
