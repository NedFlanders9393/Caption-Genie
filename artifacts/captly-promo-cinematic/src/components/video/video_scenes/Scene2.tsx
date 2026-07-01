import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 3800), // exiting
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="w-full max-w-[85%] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(58,49,41,0.1)] overflow-hidden border border-gray-100"
        initial={{ scale: 0.9, rotateX: 20 }}
        animate={phase >= 1 ? { scale: 1, rotateX: 0 } : { scale: 0.9, rotateX: 20 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Mock Instagram post UI header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-50">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="flex flex-col gap-1">
            <div className="w-24 h-3 bg-gray-200 rounded-full" />
            <div className="w-16 h-2 bg-gray-100 rounded-full" />
          </div>
        </div>

        {/* Mock image placeholder */}
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center p-8">
          <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Caption input area */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 mt-1" />
            <div className="flex-1 relative h-10">
              <motion.div 
                className="absolute inset-0 text-[#A39688] text-sm pt-1.5"
                initial={{ opacity: 1 }}
                animate={phase >= 2 ? { opacity: 0 } : { opacity: 1 }}
              >
                Write a caption...
              </motion.div>
              
              <motion.div 
                className="absolute left-0 top-1.5 w-0.5 h-4 bg-[#E8B669]"
                initial={{ opacity: 0 }}
                animate={
                  phase >= 2 && phase < 4 
                    ? { opacity: [1, 0, 1] } 
                    : { opacity: 0 }
                }
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating text elements */}
      <motion.div 
        className="absolute top-[20%] right-[10%] bg-[#3A3129] text-white px-4 py-2 rounded-2xl rounded-br-none shadow-xl text-sm font-semibold"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        Ugh, what do I write?
      </motion.div>
      
      <motion.div 
        className="absolute bottom-[25%] left-[5%] bg-white text-[#3A3129] px-4 py-2 rounded-2xl rounded-bl-none shadow-xl border border-[#F0E3D3] text-sm font-semibold"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        *stares blankly* 😐
      </motion.div>

      <motion.div 
        className="absolute bottom-[10%] w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-xl font-bold text-[#3A3129]">Blank page syndrome?</p>
      </motion.div>
    </motion.div>
  );
}