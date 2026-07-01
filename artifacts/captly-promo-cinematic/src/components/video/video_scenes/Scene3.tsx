import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300), // Introduce UI
      setTimeout(() => setPhase(2), 1200), // Type input
      setTimeout(() => setPhase(3), 2200), // Press generate
      setTimeout(() => setPhase(4), 2800), // Loading state
      setTimeout(() => setPhase(5), 3500), // Show results
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="w-full text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-black text-[#3A3129] leading-tight">
          Meet <span className="text-[#E8B669]">Captly</span>.
        </h2>
        <p className="text-[#70655B] text-sm">AI captions in seconds.</p>
      </motion.div>

      <motion.div 
        className="w-full bg-white rounded-[2rem] shadow-2xl border border-[#F0E3D3] p-5 flex flex-col gap-4"
        initial={{ opacity: 0, y: 40 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Input Area */}
        <div className="bg-[#F8F3EA] rounded-2xl p-4 min-h-[100px] relative">
          <motion.div
            className="text-[#3A3129] font-medium"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            "Just launched our new spring coffee blend! Let people know it has notes of caramel and comes in sustainable packaging."
          </motion.div>
          {phase >= 1 && phase < 2 && (
            <span className="text-[#A39688]">Describe your post...</span>
          )}
        </div>

        {/* Generate Button */}
        <motion.div
          className="w-full bg-[#E8B669] text-white rounded-2xl py-3.5 flex items-center justify-center font-bold text-lg shadow-[0_8px_20px_-8px_#E8B669] relative overflow-hidden"
          whileTap={{ scale: 0.98 }}
          animate={
            phase === 3 ? { scale: 0.95, backgroundColor: '#D4A35A' } : 
            phase >= 4 ? { opacity: 0, height: 0, padding: 0, margin: 0 } : {}
          }
        >
          Generate Magic ⚡️
          {phase === 3 && (
            <motion.div 
              className="absolute inset-0 bg-white/30"
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.div>

        {/* Loading Spinner */}
        {phase === 4 && (
          <motion.div 
            className="flex justify-center py-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-8 h-8 border-4 border-[#F8F3EA] border-t-[#E8B669] rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Results Container */}
        {phase >= 5 && (
          <motion.div 
            className="flex flex-col gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-[#A39688] uppercase tracking-wider">3 OPTIONS GENERATED</span>
            </div>
            
            {/* Caption Option 1 */}
            <motion.div 
              className="bg-white rounded-2xl p-4 border border-[#F8F3EA] shadow-sm relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute top-0 right-0 bg-[#E8B669] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">PLAYFUL</div>
              <p className="text-sm text-[#3A3129]">Spring has officially sprung in your cup! 🌸☕️ Meet our newest blend: smooth caramel notes packed in our new 100% compostable bags. Good for your morning, good for the planet. 🌍✨</p>
            </motion.div>

            {/* Caption Option 2 */}
            <motion.div 
              className="bg-white rounded-2xl p-4 border border-[#F8F3EA] shadow-sm relative opacity-60 scale-95 origin-top"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.6, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="absolute top-0 right-0 bg-[#A39688] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">PROFESSIONAL</div>
              <p className="text-sm text-[#3A3129] line-clamp-2">Elevate your coffee program this spring. We're proud to introduce our latest seasonal blend...</p>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}