import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-6 w-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div 
        className="w-full max-w-[85vw] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-black/5 flex flex-col"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <div className="bg-[var(--color-bg-muted)] p-6 pb-8 text-center border-b border-black/5">
          <div className="text-[var(--color-text-primary)] font-bold text-xl mb-4">New Post</div>
          
          <div className="bg-white rounded-2xl p-4 text-left shadow-sm text-sm text-[var(--color-text-secondary)] min-h-[80px]">
            {phase >= 1 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Coffee shop morning vibe ☕️✨
              </motion.span>
            )}
          </div>
          
          <motion.div 
            className="mt-6 bg-[var(--color-primary)] text-[var(--color-bg-light)] rounded-full py-4 font-bold text-lg"
            animate={phase >= 2 ? { scale: 0.95, backgroundColor: 'var(--color-text-primary)' } : {}}
            transition={{ duration: 0.2 }}
          >
            {phase >= 2 ? 'Generating...' : 'Generate Captions'}
          </motion.div>
        </div>
        
        <div className="p-4 bg-gray-50 flex-1 flex flex-col gap-3 min-h-[250px]">
          {phase >= 3 && (
            <motion.div 
              className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 text-sm"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              Start your day right! The perfect brew awaits... #MorningVibes #CoffeeLover
            </motion.div>
          )}
          {phase >= 4 && (
            <motion.div 
              className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 text-sm"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              Nothing beats the smell of fresh espresso to kick off the morning. ☕️🌅 #CoffeeTime
            </motion.div>
          )}
          {phase >= 5 && (
            <motion.div 
              className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 text-sm"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              Fueling up for a great day ahead! Come grab your cup. ✨ #LocalCafe
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}