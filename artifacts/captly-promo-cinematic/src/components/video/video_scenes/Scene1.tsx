import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800), // start exiting
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full relative">
        {/* Decorative quotes */}
        <motion.div 
          className="absolute -top-12 -left-4 text-8xl text-[#E8B669] opacity-30 font-serif leading-none"
          initial={{ opacity: 0, x: -20, rotate: -20 }}
          animate={phase >= 1 ? { opacity: 0.3, x: 0, rotate: 0 } : { opacity: 0, x: -20, rotate: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          "
        </motion.div>

        <motion.h1 
          className="text-5xl font-black text-center text-[#3A3129] leading-[1.1] tracking-tight"
        >
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 30, rotateX: 45 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 45 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            STOP
          </motion.span>
          <motion.span 
            className="block text-[#E8B669]"
            initial={{ opacity: 0, y: 30, rotateX: 45 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 45 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            WASTING TIME
          </motion.span>
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 30, rotateX: 45 }}
            animate={phase >= 3 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 45 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            ON CAPTIONS.
          </motion.span>
        </motion.h1>

        {/* Small floating elements */}
        <motion.div 
          className="absolute -bottom-8 -right-4 w-12 h-12 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm flex items-center justify-center"
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, rotate: 12 } : { opacity: 0, scale: 0, rotate: -45 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <span className="text-xl">⏳</span>
        </motion.div>
      </div>
    </motion.div>
  );
}