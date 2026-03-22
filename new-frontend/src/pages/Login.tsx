import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROLES: Role[] = ['user', 'admin', 'volunteer'];

const Login = () => {
  const { enter, connectWallet } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('user');
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');

  const handleEnter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    enter(role, name, wallet);
    navigate('/dashboard', { replace: true });
  };

  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setWallet(address);
    }
  };

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
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 scanning-line-blue opacity-[0.03] z-10"></div>

        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-brand-secondary/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-brand-secondary/20 blur-[120px]"
        />

        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 0, x: `${particle.x}%`, y: `${particle.y}%` }}
            animate={{
              opacity: [0, 0.3, 0],
              y: [`${particle.y}%`, `${particle.y - 20}%`],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'linear',
            }}
            className="absolute rounded-full bg-brand-secondary blur-[1px]"
            style={{ width: particle.size, height: particle.size }}
          />
        ))}
      </div>

      <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-white/5 bg-bg-base/80 px-12 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand-primary">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">RESQNET</h1>
        </motion.div>
      </nav>

      <section className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-12 py-20">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel relative overflow-hidden rounded-sm border-white/10 p-8"
          >
            <div className="pointer-events-none absolute inset-0 scanning-line opacity-5"></div>
            <div className="relative z-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">Access Portal</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                    Authenticate to Command Center
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="btn-tactical btn-secondary px-3 py-1.5 text-[10px]"
                >
                  <Wallet className="h-3 w-3" />
                  <span>Connect Wallet</span>
                </button>
              </div>

              <form onSubmit={handleEnter} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                    Role
                  </label>
                  <div className="flex items-center rounded-sm border border-white/5 bg-bg-elevated p-1">
                    {ROLES.map((nextRole) => (
                      <button
                        key={nextRole}
                        type="button"
                        onClick={() => setRole(nextRole)}
                        className={cn(
                          'flex-1 rounded-sm px-3 py-2 text-center text-xs font-mono uppercase tracking-widest transition-all',
                          role === nextRole
                            ? 'bg-brand-primary/20 font-bold text-brand-primary'
                            : 'text-text-secondary hover:text-white',
                        )}
                      >
                        {nextRole}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your callsign..."
                    required
                    className="w-full rounded-sm border border-white/5 bg-bg-elevated px-4 py-2.5 text-sm transition-all focus:border-brand-primary/50 focus:outline-none"
                  />
                </div>

                {role === 'volunteer' && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-sm border border-white/5 bg-bg-elevated px-4 py-2.5 font-mono text-sm transition-all focus:border-brand-primary/50 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-tactical btn-primary w-full justify-center py-3 text-sm"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Login;
