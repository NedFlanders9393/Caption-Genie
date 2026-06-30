import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Text + Input prompt appears
      setTimeout(() => setPhase(2), 800),   // Tone chips appear
      setTimeout(() => setPhase(3), 1300),  // Select "Playful"
      setTimeout(() => setPhase(4), 1600),  // Generation spark
      setTimeout(() => setPhase(5), 1900),  // Captions appear
      setTimeout(() => setPhase(6), 3100),  // Exit
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
        
        <h2 className="text-4xl font-black text-[var(--color-bg-dark)] leading-[1.1] tracking-tight text-center mb-4">
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
          <div className="text-[var(--color-bg-dark)] font-semibold text-[15px] flex items-center gap-2">
            <span>New caramel latte just dropped 🍂</span>
          </div>
        </motion.div>

        {/* Tone Chips */}
        <motion.div 
          className="flex flex-wrap gap-2 justify-center mt-1"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {['Professional', 'Friendly', 'Playful', 'Bold', 'Luxury'].map((tone, i) => {
            const isSelected = tone === 'Playful' && phase >= 3;
            return (
              <motion.div
                key={tone}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-colors border"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={phase >= 2 ? { opacity: 1, scale: isSelected ? 1.05 : 1, y: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
                transition={{ 
                  duration: 0.4, 
                  delay: phase >= 2 && phase < 3 ? i * 0.05 : 0, 
                  type: "spring", 
                  bounce: 0.5 
                }}
                style={{
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--color-bg-dark)',
                  borderColor: isSelected ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'
                }}
              >
                {tone} {isSelected && '✨'}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Generation Spark */}
        <div className="flex justify-center h-8 items-center mt-1">
          {phase >= 4 && phase < 5 && (
             <motion.div 
               initial={{ scale: 0, opacity: 0, rotate: -45 }}
               animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0], rotate: 0 }}
               transition={{ duration: 0.4 }}
               className="text-[var(--color-primary)] text-2xl drop-shadow-md"
             >
               ⚡
             </motion.div>
          )}
        </div>

        {/* Generated Caption */}
        <div className="relative h-[130px] flex justify-center">
          {/* Card 1 */}
          <motion.div
            className="w-full bg-white rounded-2xl p-4 shadow-xl shadow-black/5 border border-black/5"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={phase >= 5 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            style={{ zIndex: 2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[10px]">✨</div>
              <div className="text-[10px] font-bold text-[var(--color-bg-dark)]/50 uppercase tracking-wider">Playful Voice</div>
            </div>
            <p className="text-[14px] text-[var(--color-bg-dark)] leading-snug font-medium">
              Fall just got cozier ☕ Our new caramel latte is here — sweet, smooth, and waiting for you. 🍂 <span className="text-[var(--color-primary)]">#FallVibes #CaramelLatte</span>
            </p>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
