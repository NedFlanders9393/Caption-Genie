import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Hero Title
      setTimeout(() => setPhase(2), 800),  // Brand chips drop in
      setTimeout(() => setPhase(3), 1600), // Magic glow + caption appears
      setTimeout(() => setPhase(4), 3800), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const chips = ['☕️ Bloom Coffee', '🍂 Warm', '🚫 No Jargon'];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-start pt-20 px-6 z-20"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="w-full text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        <div className="inline-block bg-[#E8B669] text-[#3A3129] px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest mb-4 shadow-md">
          Brand Voice
        </div>
        <h2 className="text-4xl font-black text-[#3A3129] leading-tight mb-8">
          Captions that sound <br/>
          <span className="text-[#E8B669] text-5xl">like YOU.</span>
        </h2>
      </motion.div>

      {/* Input chips */}
      <div className="flex flex-wrap justify-center gap-3 mb-8 w-full max-w-sm">
        {chips.map((chip, i) => (
          <motion.div
            key={chip}
            className="bg-white border-[3px] border-[#3A3129] text-[#3A3129] font-black text-sm px-5 py-3 rounded-2xl shadow-[3px_3px_0_0_#3A3129]"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.15 }}
          >
            {chip}
          </motion.div>
        ))}
      </div>

      {/* Output Caption */}
      <motion.div
        className="w-full bg-[#3A3129] rounded-3xl p-6 shadow-2xl relative border-4 border-[#E8B669]"
        initial={{ opacity: 0, y: 40, rotateX: -20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 40, rotateX: -20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <motion.div 
          className="absolute -top-6 -right-6 text-5xl drop-shadow-lg"
          initial={{ scale: 0, rotate: -45 }}
          animate={phase >= 3 ? { scale: 1, rotate: 10 } : { scale: 0 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          ✨
        </motion.div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E8B669] flex items-center justify-center text-lg font-black text-[#3A3129]">BC</div>
          <div className="text-[#FFFDF9] font-black text-lg">Bloom Coffee</div>
        </div>
        <p className="text-[#FFFDF9] font-medium leading-relaxed text-lg">
          new season, same cozy corner ☕️🍂 fair-trade beans, big comfy chairs, zero corporate nonsense. come stay a while 💛
        </p>
      </motion.div>

    </motion.div>
  );
}
