import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // 3 options header
      setTimeout(() => setPhase(2), 600),  // cards pop
      setTimeout(() => setPhase(3), 1800), // swap to 22 industries
      setTimeout(() => setPhase(4), 2100), // grid pops
      setTimeout(() => setPhase(5), 3300), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const industries = ['☕ Coffee', '💇 Salon', '💪 Gym', '🏡 Realtor', '👗 Boutique', '🍽️ Dining', '🌿 Landscaping', '💅 Spa'];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-6 z-20"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      {/* Phase 1 & 2: 3 Options */}
      {phase < 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          >
            1 Idea <br/>
            <span className="text-[#E8B669] text-5xl">= 3 Captions</span>
          </motion.h2>

          <div className="flex flex-col gap-4 w-full">
            {[1, 2, 3].map((num, i) => (
              <motion.div
                key={num}
                className="bg-white border-[3px] border-[#3A3129] rounded-2xl p-5 shadow-[4px_4px_0_0_#3A3129] w-full flex items-center gap-4"
                initial={{ opacity: 0, x: -40, scale: 0.9 }}
                animate={phase >= 2 ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -40, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.15 }}
              >
                <div className="w-8 h-8 rounded-full bg-[#E8B669] flex items-center justify-center text-[#3A3129] font-black text-xl shrink-0">{num}</div>
                <div className="h-3 bg-[#E8B669]/30 rounded-full w-full" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Phase 3 & 4: 22 Industries */}
      {phase >= 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          >
            Built for <br/>
            <span className="text-[#E8B669] text-5xl">22+ Industries</span>
          </motion.h2>

          <div className="grid grid-cols-2 gap-3 w-full">
            {industries.map((ind, i) => (
              <motion.div
                key={ind}
                className="bg-white border-2 border-[#E8B669] rounded-2xl p-4 shadow-md font-black text-[#3A3129] text-base flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 }}
              >
                {ind}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
