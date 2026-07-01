import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const BUSINESSES = [
  { name: 'Coffee Shop', icon: '☕️' },
  { name: 'Hair Salon', icon: '💇' },
  { name: 'Real Estate', icon: '🏡' },
  { name: 'Fitness Coach', icon: '💪' },
  { name: 'Boutique', icon: '👗' },
  { name: 'Restaurant', icon: '🍽️' },
  { name: 'Landscaping', icon: '🌿' },
  { name: 'Bakery', icon: '🥐' },
];

const FLOATERS = [
  { emoji: '❤️', x: '12%', delay: 0 },
  { emoji: '💬', x: '78%', delay: 0.5 },
  { emoji: '🔁', x: '30%', delay: 1.0 },
  { emoji: '❤️', x: '65%', delay: 1.4 },
  { emoji: '⭐️', x: '45%', delay: 1.9 },
  { emoji: '❤️', x: '88%', delay: 2.3 },
];

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // header
      setTimeout(() => setPhase(2), 700),  // grid pops in
      setTimeout(() => setPhase(3), 2200), // engagement stat
      setTimeout(() => setPhase(4), 4000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.15, filter: 'blur(8px)' }}
      transition={{ duration: 0.7 }}
    >
      {/* Floating engagement reactions */}
      {FLOATERS.map((f, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl z-30 pointer-events-none"
          style={{ left: f.x, bottom: '18%' }}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={
            phase >= 2
              ? { opacity: [0, 1, 1, 0], y: [-10, -160], scale: [0.5, 1.2, 1] }
              : { opacity: 0 }
          }
          transition={{ duration: 2.6, delay: f.delay, repeat: Infinity, repeatDelay: 0.4, ease: 'easeOut' }}
        >
          {f.emoji}
        </motion.div>
      ))}

      {/* Header */}
      <motion.div
        className="w-full text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-black text-[#3A3129] leading-tight">Made for every business.</h2>
        <p className="text-[#E8B669] font-bold mt-1">One tap. Any industry.</p>
      </motion.div>

      {/* Business grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {BUSINESSES.map((b, i) => (
          <motion.div
            key={b.name}
            className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-2xl px-3 py-3 flex items-center gap-2.5"
            initial={{ opacity: 0, scale: 0.4, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.4, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20, delay: i * 0.08 }}
          >
            <div className="w-9 h-9 rounded-full bg-[#F8F3EA] flex items-center justify-center text-lg shrink-0">
              {b.icon}
            </div>
            <span className="font-bold text-[#3A3129] text-xs leading-tight">{b.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Engagement stat */}
      <motion.div
        className="mt-6 bg-[#3A3129] rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <span className="text-2xl">📈</span>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-black text-[#FFFDF9]">More engagement</span>
          <span className="text-xs font-semibold text-[#E8B669]">Posts that actually get seen</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
