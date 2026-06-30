import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-30 bg-[#FFFDF9]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="relative flex flex-col items-center">
        {/* Glow behind logo */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#E8B669]/30 rounded-full blur-[50px] -z-10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* App Icon */}
        <motion.div
          className="w-32 h-32 bg-[#3A3129] rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 overflow-hidden relative border border-white/20"
          initial={{ scale: 0, rotate: -20, y: 50 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Use the actual public asset */}
          <img 
            src={`${import.meta.env.BASE_URL}images/captly-logo.png`} 
            alt="Captly Logo" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to CSS logo if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('fallback-logo');
            }}
          />
          {/* Fallback CSS lightning bolt if image fails */}
          <div className="hidden absolute inset-0 [.fallback-logo_&]:flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16 text-[#E8B669]">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor" />
            </svg>
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.h1 
          className="text-6xl font-black text-[#3A3129] tracking-tight mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Captly
        </motion.h1>

        {/* Tagline */}
        <motion.p 
          className="text-xl text-[#70655B] font-medium text-center mb-12"
          initial={{ opacity: 0, filter: 'blur(5px)' }}
          animate={phase >= 1 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(5px)' }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Captions that convert.<br/>In seconds.
        </motion.p>

        {/* App Store Badge */}
        <motion.div
          className="bg-black text-white rounded-xl px-4 py-2 flex items-center gap-3 cursor-default"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          whileHover={{ scale: 1.05 }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.67 2.14-3.13 1.53-2.7 5.98.58 7.15-.59 1.49-1.53 3.01-2.9 4.38V20.28zM12.03 7.25C11.97 3.96 15.65 1.56 18.2 1c.34 3.61-3.6 6.36-6.17 6.25z"/>
          </svg>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] text-gray-300 mb-0.5">Download on the</span>
            <span className="text-lg font-semibold -mt-1">App Store</span>
          </div>
        </motion.div>
        
        {/* Availability text */}
        <motion.p
          className="text-sm text-[#A39688] font-bold mt-6 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Available Now
        </motion.p>
      </div>
    </motion.div>
  );
}