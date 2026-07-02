import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),  // Robot entry
      setTimeout(() => setPhase(2), 1000), // Cross out / transition
      setTimeout(() => setPhase(3), 1300), // Fast bold text
      setTimeout(() => setPhase(4), 2300), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFDF9] z-20 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative w-full max-w-sm text-center">
        {/* Step 1: Every AI caption... */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase === 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="text-[12vh] leading-none mb-4">🤖</div>
          <h1 className="text-3xl font-black text-[#3A3129] leading-tight">
            Every AI caption sounds like a robot.
          </h1>
        </motion.div>

        {/* Step 2: NOT THIS ONE */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={phase >= 2 && phase < 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -40, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <motion.div 
            className="bg-[#E8B669] text-[#3A3129] px-6 py-3 rounded-2xl shadow-xl transform rotate-[-2deg]"
            animate={phase >= 3 ? { rotate: [ -2, 2, -1, 0 ] } : {}}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl font-black uppercase tracking-tight whitespace-nowrap">
              Not this one.
            </h1>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
