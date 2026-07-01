import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // header + panel in
      setTimeout(() => setPhase(2), 900),  // personality chips
      setTimeout(() => setPhase(3), 1700), // rules (always / never)
      setTimeout(() => setPhase(4), 2700), // on-brand caption result
      setTimeout(() => setPhase(5), 5000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const personality = ['Playful', 'Bold', 'Warm'];
  const style = ['Short punchy lines', 'Heavy emojis'];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <motion.div
        className="w-full text-center mb-5"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 bg-[#E8B669]/15 rounded-full px-3 py-1 mb-2">
          <span className="text-base">✨</span>
          <span className="text-xs font-black uppercase tracking-widest text-[#B8863A]">Brand Voice</span>
        </div>
        <h2 className="text-3xl font-black text-[#3A3129] leading-tight">
          Sounds like <span className="text-[#E8B669]">you</span>.
        </h2>
        <p className="text-[#70655B] text-sm mt-1">Teach Captly your style once.</p>
      </motion.div>

      {/* Brand Voice setup panel */}
      <motion.div
        className="w-full bg-white rounded-[2rem] shadow-2xl border border-[#F0E3D3] p-5 flex flex-col gap-3.5"
        initial={{ opacity: 0, y: 40 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Brand name row */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3A3129] flex items-center justify-center text-[#E8B669] font-black text-lg shrink-0">
            B
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39688]">Brand name</span>
            <span className="text-base font-black text-[#3A3129]">Bloom &amp; Bean Café</span>
          </div>
        </div>

        {/* Personality chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39688]">Personality</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {personality.map((p, i) => (
              <motion.span
                key={p}
                className="text-xs font-bold text-[#B8863A] bg-[#F8F3EA] border border-[#EBD9BE] rounded-full px-3 py-1"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.1 }}
              >
                {p}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Writing style chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39688]">Writing style</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {style.map((s, i) => (
              <motion.span
                key={s}
                className="text-xs font-bold text-[#3A3129] bg-white border border-[#F0E3D3] rounded-full px-3 py-1"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 + i * 0.1 }}
              >
                {s}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Always / Never rules */}
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex-1 bg-[#EEF7EE] rounded-xl px-3 py-2 border border-[#D3E8D3]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A9E5A]">Always</span>
            <p className="text-xs font-semibold text-[#3A3129] leading-tight">Fair-trade · cozy</p>
          </div>
          <div className="flex-1 bg-[#FBEEEE] rounded-xl px-3 py-2 border border-[#EFD3D3]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C25B5B]">Avoid</span>
            <p className="text-xs font-semibold text-[#3A3129] leading-tight">Corporate jargon</p>
          </div>
        </motion.div>
      </motion.div>

      {/* On-brand caption result */}
      <motion.div
        className="w-full mt-3 bg-[#3A3129] rounded-2xl p-4 shadow-2xl relative overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm">⚡</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E8B669]">On-brand caption</span>
        </div>
        <p className="text-sm text-[#FFFDF9] font-medium leading-snug">
          new season, same cozy corner ☕️🍂 fair-trade beans, big comfy chairs, zero corporate nonsense. come stay a while 💛
        </p>
      </motion.div>
    </motion.div>
  );
}
