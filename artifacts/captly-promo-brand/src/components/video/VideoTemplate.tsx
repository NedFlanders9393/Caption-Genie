import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS = {
  hook: 2500,
  brandvoice: 4000,
  options_industries: 3500,
  platforms_hashtags: 3500,
  time_remix: 3500,
  close: 3000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1,
  brandvoice: Scene2,
  options_industries: Scene3,
  platforms_hashtags: Scene4,
  time_remix: Scene5,
  close: Scene6,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div
      className="w-full h-screen overflow-hidden relative flex justify-center bg-black"
      style={{ backgroundColor: '#000000' }}
    >
      {/* 9:16 aspect ratio container for mobile preview style */}
      <div className="w-[56.25vh] min-w-[320px] max-w-full h-full relative overflow-hidden bg-[#FFFDF9]">
        
        {/* Persistent background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated gradient orbs for kinetic feel */}
          <motion.div 
            className="absolute w-[80vh] h-[80vh] rounded-full blur-[100px] opacity-20 mix-blend-normal"
            style={{ background: 'radial-gradient(circle, #E8B669, transparent 70%)' }}
            animate={{ 
              x: ['-20%', '30%', '-10%'], 
              y: ['-10%', '40%', '10%'],
              scale: [1, 1.2, 0.9]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} 
          />
          <motion.div 
            className="absolute w-[60vh] h-[60vh] rounded-full blur-[80px] opacity-15 right-0 bottom-0"
            style={{ background: 'radial-gradient(circle, #D4A35A, transparent 70%)' }}
            animate={{ 
              x: ['10%', '-30%', '5%'], 
              y: ['10%', '-20%', '15%'] 
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} 
          />
        </div>

        {/* Dynamic moving accent block */}
        <motion.div
          className="absolute rounded-full bg-[#E8B669] z-10"
          animate={{
            x: ['80vw', '10vw', '60vw', '15vw', '80vw', '50vw'][sceneIndex],
            y: ['10vh', '80vh', '20vh', '60vh', '80vh', '40vh'][sceneIndex],
            scale: [0, 1, 0.6, 1.2, 0.8, 0][sceneIndex],
            width: '8vh',
            height: '8vh',
            opacity: sceneIndex === 5 ? 0 : 0.8,
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Foreground Content */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>

      </div>
    </div>
  );
}
