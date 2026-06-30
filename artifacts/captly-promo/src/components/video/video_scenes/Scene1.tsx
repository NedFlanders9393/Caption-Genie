import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="text-[10vw] font-black text-center text-[var(--color-text-primary)] leading-[1.1] mb-12"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      >
        Staring at a<br />
        <span className="text-[var(--color-primary)]">blank screen?</span>
      </motion.h1>

      <motion.div 
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-black/5"
        initial={{ y: 50, opacity: 0, rotateX: 20 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
          <div className="h-4 w-24 bg-gray-200 rounded-full"></div>
        </div>
        
        <div className="h-24 w-full bg-gray-50 rounded-xl p-4 flex">
          {phase >= 1 && (
             <motion.span 
              className="w-[2px] h-5 bg-blue-500 inline-block"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
             />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}