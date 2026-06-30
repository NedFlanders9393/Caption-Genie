import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),  // Bolt draws
      setTimeout(() => setPhase(2), 1500), // Flash & Fill
      setTimeout(() => setPhase(3), 1800), // Captly text appears
      setTimeout(() => setPhase(4), 3200), // Exit drift
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)] z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      
      {/* Background radial glow that bursts */}
      <motion.div 
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[80px] pointer-events-none"
        style={{ background: 'var(--color-primary)' }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={
          phase >= 2 
            ? { opacity: 0.2, scale: 1.5 } 
            : { opacity: 0, scale: 0.5 }
        }
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Central Logo Construction */}
      <div className="relative flex flex-col items-center justify-center z-20">
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={
            phase >= 4 
              ? { scale: 1.2, y: -20, opacity: 0 }
              : phase >= 3
                ? { scale: 1, y: -20, opacity: 1 }
                : { scale: 1, y: 20, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-32 h-32 flex items-center justify-center"
        >
          {/* SVG Lightning Bolt */}
          <motion.svg 
            viewBox="0 0 24 24" 
            className="w-24 h-24 drop-shadow-2xl"
            fill={phase >= 2 ? "var(--color-primary)" : "none"}
            stroke="var(--color-primary)"
            strokeWidth={2}
            strokeLinecap="round" 
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.path 
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              initial={{ pathLength: 0 }}
              animate={phase >= 1 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </motion.svg>

          {/* Flash overlay */}
          {phase === 2 && (
            <motion.div 
              className="absolute inset-0 bg-white rounded-full blur-md"
              initial={{ opacity: 0.8, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </motion.div>

        {/* Wordmark */}
        <div className="overflow-hidden mt-4">
          <motion.h1 
            className="text-5xl font-black text-[var(--color-bg-light)] tracking-tight"
            initial={{ y: "100%", opacity: 0 }}
            animate={
              phase >= 4
                ? { y: "-100%", opacity: 0 }
                : phase >= 3
                  ? { y: "0%", opacity: 1 }
                  : { y: "100%", opacity: 0 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            Captly
          </motion.h1>
        </div>
      </div>
    </motion.div>
  );
}
