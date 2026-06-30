import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 2600), // Exit drift
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-start justify-end p-8 pb-32 z-40 bg-[var(--color-bg-dark)]"
      initial={{ x: "100%" }}
      animate={{ x: "0%" }}
      exit={{ opacity: 0, x: "-50%" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      
      {/* Soft floating shapes inside the dark bg */}
      <motion.div 
        className="absolute top-[20%] right-[-20%] w-[80vw] h-[80vw] rounded-full blur-[60px] opacity-30"
        style={{ background: 'var(--color-primary)' }}
        animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[30%] left-[-20%] w-[60vw] h-[60vw] rounded-full blur-[50px] opacity-20"
        style={{ background: 'white' }}
        animate={{ y: [0, 40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10">
        <motion.div 
          className="w-16 h-1 bg-[var(--color-primary)] mb-6"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: 64 } : { width: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        
        <motion.h2 
          className="text-6xl font-black text-white leading-tight tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Made for
        </motion.h2>
        
        <motion.h2 
          className="text-6xl font-black text-[var(--color-primary)] leading-tight tracking-tight italic"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          Creators.
        </motion.h2>

        <motion.p
          className="text-xl text-white/70 mt-4 max-w-xs font-semibold"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          You focus on building.<br/>We'll handle the words.
        </motion.p>
      </div>

    </motion.div>
  );
}
