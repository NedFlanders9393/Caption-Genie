import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-light)] w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="w-32 h-32 rounded-3xl border-[6px] border-[var(--color-primary)] flex items-center justify-center mb-8 relative overflow-hidden"
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <motion.div 
          className="absolute inset-0 bg-[var(--color-primary)]/10"
        />
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </motion.div>

      <motion.h1 
        className="text-[12vw] font-black tracking-tight text-[var(--color-text-primary)]"
        initial={{ y: 20, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        transition={{ type: 'spring' }}
      >
        Captly
      </motion.h1>

      <motion.p
        className="text-[5vw] font-bold text-[var(--color-text-muted)] mt-2"
        initial={{ y: 10, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
      >
        Captions in seconds.
      </motion.p>
    </motion.div>
  );
}