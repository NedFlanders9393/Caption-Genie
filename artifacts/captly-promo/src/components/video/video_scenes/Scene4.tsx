import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1900),
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

      <motion.a
        className="mt-10 flex items-center gap-3 rounded-2xl bg-[var(--color-text-primary)] pl-5 pr-6 py-4 shadow-lg pointer-events-none"
        initial={{ y: 24, opacity: 0, scale: 0.9 }}
        animate={phase >= 3 ? { y: 0, opacity: 1, scale: 1 } : { y: 24, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <svg width="34" height="34" viewBox="0 0 384 512" fill="var(--color-bg-light)" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
        </svg>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[2.6vw] font-semibold text-[var(--color-bg-light)]/80">Now available on the</span>
          <span className="text-[5vw] font-black text-[var(--color-bg-light)] -mt-0.5">App Store</span>
        </div>
      </motion.a>
    </motion.div>
  );
}
