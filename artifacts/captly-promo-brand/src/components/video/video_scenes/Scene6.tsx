import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Logo
      setTimeout(() => setPhase(2), 800),  // Text
      setTimeout(() => setPhase(3), 1400), // Badge
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFDF9] z-50 px-6"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Lockup */}
        <motion.div
          className="flex flex-col items-center justify-center gap-4 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl bg-[#3A3129]">
            <img 
              src={`${import.meta.env.BASE_URL}images/captly-logo.png`} 
              alt="Captly Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to SVG if not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#E8B669] hidden" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-6xl font-black text-[#3A3129] tracking-tight">Captly</h1>
        </motion.div>

        <motion.div
          className="h-[4px] bg-[#E8B669] w-24 mb-8 rounded-full"
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        <motion.p
          className="text-3xl font-black text-[#3A3129] text-center mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6 }}
        >
          Sound like <span className="text-[#E8B669]">YOU.</span>
        </motion.p>

        {/* App Store Badge simulation */}
        <motion.div
          className="bg-[#3A3129] text-[#FFFDF9] px-8 py-5 rounded-full flex items-center gap-3 font-bold text-xl shadow-2xl border-2 border-[#E8B669]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-[#FFFDF9]" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.634 14.594c-.035-2.73 2.222-4.045 2.324-4.11-1.266-1.854-3.23-2.106-3.94-2.14-1.67-.17-3.266 1.002-4.12 1.002-.852 0-2.164-1.01-3.535-.98-1.782.028-3.42 1.054-4.34 2.666-1.864 3.256-.476 8.083 1.34 10.74 .887 1.3 1.94 2.763 3.326 2.712 1.332-.054 1.838-.87 3.35-.87 1.51 0 1.986.87 3.376.842 1.436-.027 2.34-1.327 3.22-2.628 1.018-1.5 1.436-2.956 1.457-3.032-.033-.014-2.825-1.1-2.858-4.2zM15.006 5.568c.732-.898 1.226-2.143 1.09-3.385-1.066.044-2.368.72-3.12 1.62-.676.803-1.272 2.072-1.11 3.29 1.192.093 2.408-.62 3.14-1.525z"/>
          </svg>
          Free on the App Store
        </motion.div>
      </div>
    </motion.div>
  );
}
