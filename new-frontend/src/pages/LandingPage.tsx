import React from 'react';
import {
  ShieldCheck,
  Globe,
  ArrowRight,
  Activity,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleEnterCommandCenter = () => {
    navigate('/login', { replace: true });
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
    <div className="min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 z-10 scanning-line-blue opacity-[0.03]"></div>

        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-brand-secondary/20 blur-[120px]"
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

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          <button type="button" onClick={handleEnterCommandCenter} className="btn-tactical btn-primary">
            <span>Start</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </nav>

      <section className="relative overflow-hidden px-12 pb-20 pt-32">
        <div className="relative z-10 mx-auto max-w-6xl space-y-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="space-y-6"
          >
            <h1 className="text-6xl font-bold leading-none tracking-tighter md:text-8xl">
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
                className="block text-text-secondary"
              >
                for the Real World.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="mx-auto max-w-2xl text-xl leading-relaxed text-text-secondary"
            >
              ResQNet is a decentralized tactical command system that leverages AI and community
              governance to provide rapid, reliable emergency assistance.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center"
          >
            <button
              type="button"
              onClick={handleEnterCommandCenter}
              className="btn-tactical btn-primary relative overflow-hidden px-8 py-4 text-lg group"
            >
              <span className="relative z-10">Enter Command Center</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden px-12 py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-20 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Core System Architecture</h2>
              <p className="text-lg leading-relaxed text-text-secondary">
                Our infrastructure is designed to survive the most extreme conditions, ensuring
                that help is always just a node away.
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
                  className="glass-panel group flex items-center gap-4 rounded-sm p-4 transition-colors hover:bg-white/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/5 transition-colors group-hover:bg-brand-secondary/20">
                    <item.icon className="h-5 w-5 text-brand-secondary" />
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
            <div className="absolute inset-0 animate-pulse-soft rounded-full bg-brand-primary/10 blur-[100px]"></div>
            <div className="glass-panel relative z-10 overflow-hidden rounded-sm border-white/10 p-8">
              <div className="absolute inset-0 scanning-line opacity-10"></div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 animate-pulse text-brand-primary" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">
                      Active Incident
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-tertiary">#SOS-8821</span>
                </div>
                <div className="h-px bg-white/5"></div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                      AI Analysis
                    </p>
                    <div className="rounded-sm border border-white/5 bg-white/5 p-3 text-xs italic text-text-secondary">
                      &quot;Cardiac arrest confirmed via audio triage. Dispatching nearest ALS
                      unit.&quot;
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-brand-accent"></div>
                      <span className="text-[10px] font-mono uppercase tracking-widest">
                        Unit Intercepting
                      </span>
                    </div>
                    <span className="text-xs font-bold">VOL-001 (EMT-B)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative border-t border-white/5 bg-bg-base px-12 py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-12 md:flex-row">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-primary">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">RESQNET</h1>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-text-tertiary">
              Empowering communities to respond to emergencies through technology and collective
              action.
            </p>
          </div>

          <div className="flex items-center gap-8">
            {['Documentation', 'Privacy Protocol', 'Network Status'].map((item) => (
              <a key={item} href="#" className="text-xs text-text-tertiary transition-colors hover:text-white">
                {item}
              </a>
            ))}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
            (c) 2026 ResQNet Foundation. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
