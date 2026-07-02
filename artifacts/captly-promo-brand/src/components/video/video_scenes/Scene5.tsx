import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Time header
      setTimeout(() => setPhase(2), 600),  // Clock pop
      setTimeout(() => setPhase(3), 1800), // Remix header
      setTimeout(() => setPhase(4), 2100), // Remix buttons
      setTimeout(() => setPhase(5), 3300), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-6 z-20"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      {/* Best Time */}
      {phase < 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          >
            Tells you the <br/>
            <span className="text-[#E8B669] text-5xl">Best Time</span><br/>
            to post.
          </motion.h2>

          <motion.div
            className="bg-[#E8B669] text-[#3A3129] border-[4px] border-[#3A3129] rounded-full w-48 h-48 flex flex-col items-center justify-center shadow-[6px_6px_0_0_#3A3129]"
            initial={{ opacity: 0, scale: 0.3, rotate: -45 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.3, rotate: -45 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <span className="text-6xl mb-2">⏰</span>
            <span className="text-3xl font-black">6:00 PM</span>
          </motion.div>
        </motion.div>
      )}

      {/* Caption Remix */}
      {phase >= 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          >
            1-Tap <br/>
            <span className="text-[#E8B669] text-5xl">Caption Remix</span>
          </motion.h2>

          <div className="flex flex-col gap-4 w-full">
            {[
              { text: 'Make it Shorter', icon: '✂️' },
              { text: 'Make it Funnier', icon: '😂' },
              { text: 'More Professional', icon: '👔' }
            ].map((btn, i) => (
              <motion.div
                key={btn.text}
                className="bg-white border-2 border-[#3A3129] text-[#3A3129] rounded-2xl p-5 shadow-[4px_4px_0_0_#3A3129] w-full flex items-center justify-between"
                initial={{ opacity: 0, x: 40 }}
                animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.15 }}
              >
                <span className="font-black text-xl">{btn.text}</span>
                <span className="text-2xl">{btn.icon}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
