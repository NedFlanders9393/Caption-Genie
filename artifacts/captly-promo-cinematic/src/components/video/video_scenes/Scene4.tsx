import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),  // Start staggered features
      setTimeout(() => setPhase(2), 1000), // Next set
      setTimeout(() => setPhase(3), 1800), // Next set
      setTimeout(() => setPhase(4), 2600), // Final set
      setTimeout(() => setPhase(5), 4500), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { title: "22 Industries", icon: "🏢", delay: 0.2, x: "-12vh", y: "-24vh", align: "left" },
    { title: "Smart Hashtags", icon: "#️⃣", delay: 0.6, x: "12vh", y: "-24vh", align: "right" },
    { title: "Platform Aware", icon: "📱", delay: 1.0, x: "-12vh", y: "24vh", align: "left" },
    { title: "Custom Tones", icon: "🎨", delay: 1.4, x: "12vh", y: "24vh", align: "right" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div 
        className="absolute top-16 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        <h2 className="text-3xl font-black text-[#3A3129]">Everything you need.</h2>
        <p className="text-[#E8B669] font-bold mt-1">Built right in.</p>
      </motion.div>

      <div className="relative w-full h-[60vh] flex items-center justify-center">
        {/* Center glowing element */}
        <motion.div 
          className="absolute w-32 h-32 bg-[#E8B669]/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Feature Cards */}
        {features.map((f, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/90 backdrop-blur-xl border border-white shadow-xl rounded-2xl p-3 flex items-center gap-2 w-40"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={
              phase >= (i + 1) 
                ? { opacity: 1, scale: 1, x: f.x, y: f.y } 
                : { opacity: 0, scale: 0, x: 0, y: 0 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ zIndex: 10 + i }}
          >
            <div className="w-10 h-10 rounded-full bg-[#F8F3EA] flex items-center justify-center text-xl shrink-0">
              {f.icon}
            </div>
            <span className="font-bold text-[#3A3129] text-sm leading-tight">{f.title}</span>
          </motion.div>
        ))}

        {/* Center UI snippet */}
        <motion.div
          className="absolute bg-[#3A3129] text-white rounded-[2rem] p-5 shadow-2xl z-30 w-56 border border-gray-700"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
        >
          <div className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Best time to post</div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-black">5:30</span>
            <span className="text-lg font-bold text-[#E8B669] mb-1">PM</span>
          </div>
          <div className="flex gap-1 h-8 items-end">
            {[30, 50, 40, 90, 60, 40, 20].map((h, i) => (
              <motion.div 
                key={i} 
                className={`flex-1 rounded-t-sm ${i === 3 ? 'bg-[#E8B669]' : 'bg-gray-700'}`}
                initial={{ height: 0 }}
                animate={phase >= 3 ? { height: `${h}%` } : { height: 0 }}
                transition={{ delay: 1 + (i * 0.1) }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}