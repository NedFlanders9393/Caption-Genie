import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Platforms header
      setTimeout(() => setPhase(2), 600),  // Platforms cards
      setTimeout(() => setPhase(3), 1800), // Hashtags swap
      setTimeout(() => setPhase(4), 2100), // Hashtags cascade
      setTimeout(() => setPhase(5), 3300), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const platforms = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook'];
  const hashtags = ['#smallbusiness', '#local', '#coffee', '#community', '#morning', '#cafe', '#vibe', '#daily'];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-6 z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      {/* Platform Aware */}
      {phase < 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          >
            Same idea.<br/>
            <span className="text-[#E8B669] text-5xl">Every Platform.</span>
          </motion.h2>

          <div className="flex flex-col gap-3 w-full">
            {platforms.map((plat, i) => (
              <motion.div
                key={plat}
                className="bg-[#3A3129] text-[#FFFDF9] border-[3px] border-[#E8B669] rounded-2xl p-4 w-full flex items-center justify-between shadow-xl"
                initial={{ opacity: 0, y: 30 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.1 }}
              >
                <span className="font-black text-lg">{plat}</span>
                <span className="text-xl">📱</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hashtags */}
      {phase >= 3 && (
        <motion.div className="w-full flex flex-col items-center absolute inset-x-6 top-1/2 -translate-y-1/2">
          <motion.h2 
            className="text-4xl font-black text-[#3A3129] leading-tight mb-8 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          >
            30 Hashtags.<br/>
            <span className="text-[#E8B669] text-5xl">1 Tap.</span>
          </motion.h2>

          <div className="flex flex-wrap justify-center gap-3 w-full">
            {hashtags.map((tag, i) => (
              <motion.div
                key={tag}
                className="bg-white border-2 border-[#3A3129] text-[#3A3129] font-black text-base px-4 py-2 rounded-xl shadow-[2px_2px_0_0_#E8B669]"
                initial={{ opacity: 0, scale: 0 }}
                animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.08 }}
              >
                {tag}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
