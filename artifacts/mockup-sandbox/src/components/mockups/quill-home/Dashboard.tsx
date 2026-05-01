import React, { useState } from 'react';
import { Feather, Plus, Copy, Check, Instagram, Twitter, Linkedin, Facebook, Activity, Flame, Hash, PenTool, Sparkles, ChevronRight, Video } from 'lucide-react';

const recentCaptions = [
  {
    id: 1,
    platform: 'Instagram',
    niche: 'Coffee Shop',
    text: 'Morning brew vibes only ☕️✨ Stop by today and try our new seasonal pour-over. Your taste buds will thank you!',
    time: '2h ago'
  },
  {
    id: 2,
    platform: 'LinkedIn',
    niche: 'B2B SaaS',
    text: 'Excited to announce our Q3 feature rollout. We\'ve listened to your feedback and made workflow automation 10x faster. 🚀',
    time: '5h ago'
  },
  {
    id: 3,
    platform: 'TikTok',
    niche: 'Fashion',
    text: 'pov: you found the perfect autumn fit 🍂✨ #fallfashion #ootd #styling',
    time: '1d ago'
  }
];

const platforms = [
  { name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-100' },
  { name: 'TikTok', icon: Video, color: 'text-gray-900', bg: 'bg-gray-200' },
  { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-100' },
  { name: 'Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-100' },
  { name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100' },
];

export function Dashboard() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (id: number) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div 
      className="relative bg-[#FAFAFA] text-[#19141F] font-sans antialiased" 
      style={{ width: 390, minHeight: 844, overflow: 'auto', fontFamily: '"Inter", sans-serif' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-center bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#7C3AED] text-white p-1.5 rounded-lg shadow-sm">
            <Feather size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight">Quill</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full border border-purple-100">
          <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse"></div>
          <span className="text-xs font-semibold text-[#7C3AED]">Brand Voice</span>
        </div>
      </header>

      <div className="p-6 space-y-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#19141F]">124</span>
            <span className="text-xs text-gray-500 font-medium mt-1 text-center">Generated</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#19141F]">5</span>
            <span className="text-xs text-gray-500 font-medium mt-1 text-center">Platforms</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <Flame size={20} className="text-orange-500 fill-orange-500" />
              <span className="text-2xl font-bold text-[#19141F]">12</span>
            </div>
            <span className="text-xs text-gray-500 font-medium mt-1 text-center">Day Streak</span>
          </div>
        </div>

        {/* CTA Card */}
        <button className="w-full text-left bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-3xl p-6 shadow-md shadow-purple-900/10 hover:shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Sparkles className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">New Caption</h2>
            <p className="text-purple-100 text-sm mb-4 max-w-[200px] leading-relaxed">
              Generate highly-converting copy for your next social post.
            </p>
            <div className="flex items-center text-white text-sm font-semibold gap-1">
              Start creating <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>

        {/* Platforms */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Quick Select</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
            {platforms.map((platform) => (
              <div key={platform.name} className="flex flex-col items-center gap-2 flex-shrink-0">
                <button className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 transition-transform active:scale-95 ${platform.bg}`}>
                  <platform.icon size={24} className={platform.color} />
                </button>
                <span className="text-[10px] font-medium text-gray-600">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Activity</h3>
            <button className="text-xs font-semibold text-[#7C3AED]">View All</button>
          </div>
          
          <div className="space-y-4">
            {recentCaptions.map((caption) => (
              <div key={caption.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                      {caption.platform}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-[10px] font-semibold text-[#7C3AED] uppercase tracking-wider">
                      {caption.niche}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{caption.time}</span>
                </div>
                
                <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-3">
                  {caption.text}
                </p>
                
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleCopy(caption.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    {copiedId === caption.id ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-gray-500" />
                        <span className="text-xs font-semibold text-gray-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
