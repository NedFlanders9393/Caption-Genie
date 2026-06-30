import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1600),
      setTimeout(() => setPhase(5), 2800), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-primary)] z-30 overflow-hidden"
      initial={{ y: "100%" }}
      animate={{ y: "0%" }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      
      <div className="relative w-full px-8 text-center">
        {/* Kinetic Type Magic */}
        <motion.h2 
          className="text-[12vw] font-black text-[var(--color-bg-dark)] leading-[1] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <motion.span 
            className="block"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={phase >= 1 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            Effortless
          </motion.span>
          <motion.span 
            className="block italic text-white"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={phase >= 2 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            Captions
          </motion.span>
        </motion.h2>

        <motion.div 
          className="mt-8 overflow-hidden inline-block"
          initial={{ height: 0 }}
          animate={phase >= 3 ? { height: "auto" } : { height: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-2xl font-bold text-[var(--color-bg-dark)]/80 py-2">
            In literal seconds.
          </p>
        </motion.div>

        {/* Abstract lightning spark bursts around */}
        {phase >= 4 && (
          <>
            <motion.div className="absolute top-0 right-10 w-4 h-16 bg-white rotate-45 origin-bottom"
              initial={{ scaleY: 0, opacity: 1 }} animate={{ scaleY: [0, 1, 0], y: -50, x: 50 }} transition={{ duration: 0.6 }} />
            <motion.div className="absolute bottom-10 left-10 w-4 h-16 bg-[var(--color-bg-dark)] -rotate-45 origin-top"
              initial={{ scaleY: 0, opacity: 1 }} animate={{ scaleY: [0, 1, 0], y: 50, x: -50 }} transition={{ duration: 0.6, delay: 0.1 }} />
          </>
        )}
      </div>

    </motion.div>
  );
}
