import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  hook: 3500,
  problem: 4500,
  solution: 5000,
  proof: 5500,
  close: 4000
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1,
  problem: Scene2,
  solution: Scene3,
  proof: Scene4,
  close: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative flex justify-center bg-[#FFFDF9]"
      style={{ backgroundColor: 'var(--color-bg-light)' }}
    >
      {/* 9:16 aspect ratio container for mobile preview style */}
      <div className="w-[56.25vh] min-w-[320px] max-w-full h-full relative overflow-hidden shadow-2xl shadow-black/10">
        
        {/* Persistent background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] mix-blend-multiply pointer-events-none z-50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          />
          
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute w-[80vh] h-[80vh] rounded-full blur-[100px] opacity-40 mix-blend-normal"
            style={{ background: 'radial-gradient(circle, #E8B669, transparent 70%)' }}
            animate={{ 
              x: ['-20%', '30%', '-10%'], 
              y: ['-10%', '40%', '10%'],
              scale: [1, 1.2, 0.9]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
          />
          <motion.div 
            className="absolute w-[60vh] h-[60vh] rounded-full blur-[80px] opacity-30 right-0 bottom-0"
            style={{ background: 'radial-gradient(circle, #D4A35A, transparent 70%)' }}
            animate={{ 
              x: ['10%', '-30%', '5%'], 
              y: ['10%', '-20%', '15%'] 
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} 
          />
        </div>

        {/* Persistent midground floating elements (transform across scenes) */}
        <motion.div
          className="absolute rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(232,182,105,0.1)] z-10"
          animate={{
            x: ['-10vw', '10vw', '50vw', '20vw', '40vw'][sceneIndex],
            y: ['20vh', '15vh', '70vh', '80vh', '15vh'][sceneIndex],
            rotate: [-15, 5, -10, 15, -5][sceneIndex],
            scale: [0.8, 1.2, 0.6, 1.5, 0.9][sceneIndex],
            width: '12vh',
            height: '12vh',
            opacity: sceneIndex === 4 ? 0 : 0.6,
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute rounded-full bg-gradient-to-tr from-[#E8B669] to-[#FDE6BA] shadow-lg z-10"
          animate={{
            x: ['80vw', '60vw', '10vw', '70vw', '50vw'][sceneIndex],
            y: ['70vh', '60vh', '20vh', '10vh', '40vh'][sceneIndex],
            scale: [0.5, 1.5, 1, 0.8, 0][sceneIndex],
            width: '6vh',
            height: '6vh',
            opacity: sceneIndex === 4 ? 0 : 0.8,
          }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Foreground Content */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>

        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />

      </div>
    </div>
  );
}
