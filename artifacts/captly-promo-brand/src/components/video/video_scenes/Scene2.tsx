import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2600), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-8 z-20"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full relative z-10 flex flex-col gap-2">
        <motion.p 
          className="text-[var(--color-primary)] font-bold text-xl uppercase tracking-widest"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          The Vibe
        </motion.p>
        
        <h2 className="text-6xl font-black text-[var(--color-bg-dark)] leading-[1.1] tracking-tight">
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 20, rotateX: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 20, rotateX: 20 }}
            transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
          >
            Your brand.
          </motion.span>
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 20, rotateX: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 20, rotateX: 20 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Your voice.
          </motion.span>
        </h2>

        {/* Decorative graphic card sliding up */}
        <motion.div
          className="mt-12 bg-white rounded-3xl p-6 shadow-xl border border-black/5 w-full relative overflow-hidden"
          initial={{ opacity: 0, y: 100, rotate: -5 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotate: -2 } : { opacity: 0, y: 100, rotate: -5 }}
          transition={{ duration: 1, type: "spring", bounce: 0.2 }}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 mb-4 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 bg-[var(--color-bg-dark)]/10 rounded-full w-3/4" />
            <div className="h-4 bg-[var(--color-bg-dark)]/10 rounded-full w-1/2" />
            <div className="h-4 bg-[var(--color-bg-dark)]/10 rounded-full w-5/6" />
          </div>
          {/* Abstract bolt watermark */}
          <svg viewBox="0 0 24 24" className="absolute -right-4 -bottom-4 w-32 h-32 text-[var(--color-primary)]/10" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
