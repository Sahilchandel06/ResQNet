import React from 'react';
import {
  Activity,
  Cpu,
  Database,
  Globe,
  ShieldCheck,
  Zap,
  Server,
  HardDrive,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useApp } from '../context/AppContext';

const data = [
  { time: '12:00', load: 45, latency: 120 },
  { time: '13:00', load: 52, latency: 135 },
  { time: '14:00', load: 48, latency: 115 },
  { time: '15:00', load: 61, latency: 150 },
  { time: '16:00', load: 55, latency: 140 },
  { time: '17:00', load: 67, latency: 165 },
];

const SystemHealth = () => {
  const { health, web3 } = useApp();

  const dbConnected = health?.database?.connected ?? false;
  const apiStatus = health ? 'Online' : 'Offline';
  const contractAddr = web3?.contractAddress || health?.blockchain?.contractAddress || 'N/A';
  const blockchainConfigured = web3?.configured ?? health?.blockchain?.configured ?? false;

  const metrics = [
    { label: 'API Status', value: apiStatus, icon: Cpu, color: apiStatus === 'Online' ? 'text-brand-accent' : 'text-brand-primary' },
    { label: 'Database', value: dbConnected ? 'Connected' : 'Offline', icon: Database, color: dbConnected ? 'text-brand-accent' : 'text-brand-primary' },
    { label: 'Blockchain', value: blockchainConfigured ? 'Configured' : 'Not configured', icon: Network, color: blockchainConfigured ? 'text-brand-warning' : 'text-text-tertiary' },
    { label: 'Uptime', value: health ? '99.99%' : '—', icon: ShieldCheck, color: 'text-brand-primary' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
        <p className="text-xs text-text-secondary font-mono uppercase tracking-widest">Real-time Infrastructure Monitoring</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <metric.icon className={metric.color + " w-12 h-12"} />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-1">{metric.label}</p>
            <h3 className="text-2xl font-bold tracking-tight">{metric.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Load Chart */}
        <div className="glass-panel p-6 rounded-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Network Load (24h)</h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-secondary rounded-full"></span>
              <span className="text-[10px] font-mono text-text-tertiary">Traffic</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid #ffffff10', borderRadius: '4px' }}
                  itemStyle={{ color: '#FFFFFF', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="load" stroke="#007AFF" fillOpacity={1} fill="url(#colorLoad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Chart */}
        <div className="glass-panel p-6 rounded-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">API Latency (ms)</h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full"></span>
              <span className="text-[10px] font-mono text-text-tertiary">Response Time</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid #ffffff10', borderRadius: '4px' }}
                  itemStyle={{ color: '#FFFFFF', fontSize: '10px' }}
                />
                <Line type="monotone" dataKey="latency" stroke="#FF3B30" strokeWidth={2} dot={{ fill: '#FF3B30', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="glass-panel p-6 rounded-sm space-y-6">
        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Backend Configuration</h4>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-bg-elevated/50 border border-white/5 rounded-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight">API Server</p>
              <div className="flex items-center gap-2">
                <span className={health ? 'text-brand-accent' : 'text-brand-primary'}>
                  <Zap className="w-3 h-3 fill-current" />
                </span>
                <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">{health?.message || 'Checking...'}</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-bg-elevated/50 border border-white/5 rounded-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight">Database</p>
              <div className="flex items-center gap-2">
                <span className={dbConnected ? 'text-brand-accent' : 'text-brand-primary'}>
                  <Database className="w-3 h-3 fill-current" />
                </span>
                <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
                  {health?.database?.name || 'N/A'} — State {health?.database?.readyState ?? '?'}
                </span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-bg-elevated/50 border border-white/5 rounded-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight">Smart Contract</p>
              <div className="flex items-center gap-2">
                <span className={blockchainConfigured ? 'text-brand-warning' : 'text-text-tertiary'}>
                  <Globe className="w-3 h-3 fill-current" />
                </span>
                <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest truncate max-w-[200px]">
                  {contractAddr}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
