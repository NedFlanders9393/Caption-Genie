import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Text + Input prompt appears
      setTimeout(() => setPhase(2), 1100),  // Generation spark
      setTimeout(() => setPhase(3), 1300),  // Captions appear
      setTimeout(() => setPhase(4), 3100),  // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-8 z-20"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full relative z-10 flex flex-col gap-2 max-w-sm mx-auto">
        <motion.p 
          className="text-[var(--color-primary)] font-bold text-lg uppercase tracking-widest text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          The Vibe
        </motion.p>
        
        <h2 className="text-4xl font-black text-[var(--color-bg-dark)] leading-[1.1] tracking-tight text-center mb-6">
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 15 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring" }}
          >
            Your brand.
          </motion.span>
          <motion.span 
            className="block"
            initial={{ opacity: 0, y: 15 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
          >
            Your voice.
          </motion.span>
        </h2>

        {/* Input Prompt Box */}
        <motion.div
          className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-black/5 w-full relative z-20"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.3 }}
        >
          <div className="text-[10px] font-bold text-[var(--color-bg-dark)]/40 uppercase tracking-wider mb-1">Describe your post</div>
          <div className="text-[var(--color-bg-dark)] font-semibold text-base flex items-center gap-2">
            <span>New caramel latte just dropped 🍂</span>
            {phase >= 2 && (
              <motion.div 
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0], rotate: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[var(--color-primary)] text-xl drop-shadow-md"
              >
                ⚡
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Generated Captions */}
        <div className="relative mt-2 h-[220px]">
          {/* Card 1 */}
          <motion.div
            className="absolute top-0 w-full bg-white rounded-2xl p-4 shadow-xl shadow-black/5 border border-black/5"
            initial={{ opacity: 0, y: 50, rotate: -4, scale: 0.9 }}
            animate={phase >= 3 ? { opacity: 1, y: 0, rotate: -2, scale: 1 } : { opacity: 0, y: 50, rotate: -4, scale: 0.9 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            style={{ zIndex: 2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[10px]">✨</div>
              <div className="text-[10px] font-bold text-[var(--color-bg-dark)]/50 uppercase tracking-wider">Option 1</div>
            </div>
            <p className="text-[13px] text-[var(--color-bg-dark)] leading-snug font-medium">
              Fall just got cozier ☕ Our new caramel latte is here — sweet, smooth, and waiting for you. 🍂 <span className="text-[var(--color-primary)]">#CoffeeLovers #FallVibes #CaramelLatte</span>
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            className="absolute top-[4.5rem] w-full bg-white/95 rounded-2xl p-4 shadow-lg border border-black/5 origin-bottom-right"
            initial={{ opacity: 0, y: 50, rotate: 0, scale: 0.85 }}
            animate={phase >= 3 ? { opacity: 1, y: 15, rotate: 3, scale: 0.95 } : { opacity: 0, y: 50, rotate: 0, scale: 0.85 }}
            transition={{ duration: 0.8, delay: 0.15, type: "spring", bounce: 0.3 }}
            style={{ zIndex: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[10px]">💛</div>
              <div className="text-[10px] font-bold text-[var(--color-bg-dark)]/40 uppercase tracking-wider">Option 2</div>
            </div>
            <p className="text-[12px] text-[var(--color-bg-dark)] leading-snug font-medium opacity-90">
              Treat yourself today 💛 The caramel latte you didn't know you needed just landed. <span className="text-[var(--color-primary)]">#NewDrop #CoffeeTime #TreatYourself</span>
            </p>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
