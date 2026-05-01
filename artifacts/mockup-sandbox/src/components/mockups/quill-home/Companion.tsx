import React from "react";
import { PenTool, Hash, History, Sparkles, ChevronRight, Zap, Coffee } from "lucide-react";

export function Companion() {
  return (
    <div
      style={{ width: 390, minHeight: 844, overflow: "auto" }}
      className="bg-[#FFFDF9] text-[#4A3F35] font-sans relative pb-20"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      
      <div className="font-outfit">
        {/* Header */}
        <header className="px-6 pt-12 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8B669] flex items-center justify-center text-white shadow-sm">
              <PenTool size={16} fill="currentColor" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-[#3A3129]">Quill</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5ECE0] border-2 border-white flex items-center justify-center overflow-hidden shadow-sm">
            <img src="https://i.pravatar.cc/150?u=sarah" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </header>

        {/* Greeting Section */}
        <section className="px-6 py-6">
          <p className="text-[#8C7A6B] text-sm font-medium mb-1">Good morning, Sarah ☀️</p>
          <h1 className="text-3xl font-bold text-[#3A3129] leading-tight max-w-[260px]">
            Ready to create something wonderful today?
          </h1>
        </section>

        {/* Tip Callout */}
        <section className="px-6 mb-8">
          <div className="bg-[#F8EFE4] rounded-2xl p-4 flex items-start gap-3 border border-[#F0E3D3]">
            <div className="mt-0.5 bg-white p-1.5 rounded-full text-[#E8B669] shadow-sm">
              <Zap size={16} />
            </div>
            <div>
              <p className="font-medium text-[#5D5045] text-sm mb-0.5">3-Day Streak! 🔥</p>
              <p className="text-[#8C7A6B] text-xs leading-relaxed">
                You're on a roll. Tip: Tuesday posts with a question in the caption get 2x more engagement.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-6 mb-8 flex gap-3 overflow-x-auto no-scrollbar py-1">
          <button className="flex-shrink-0 w-[140px] h-[160px] bg-[#3A3129] rounded-3xl p-5 flex flex-col justify-between items-start text-left shadow-lg shadow-[#3A3129]/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#E8B669] backdrop-blur-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <span className="text-white font-medium text-lg leading-tight block">Write a<br/>Caption</span>
            </div>
          </button>
          
          <button className="flex-shrink-0 w-[140px] h-[160px] bg-white rounded-3xl p-5 flex flex-col justify-between items-start text-left border border-[#F0E3D3] shadow-sm">
            <div className="w-12 h-12 bg-[#F8EFE4] rounded-2xl flex items-center justify-center text-[#9B897A]">
              <Hash size={24} />
            </div>
            <div>
              <span className="text-[#3A3129] font-medium text-lg leading-tight block">Find<br/>Hashtags</span>
            </div>
          </button>

          <button className="flex-shrink-0 w-[140px] h-[160px] bg-white rounded-3xl p-5 flex flex-col justify-between items-start text-left border border-[#F0E3D3] shadow-sm">
            <div className="w-12 h-12 bg-[#F8EFE4] rounded-2xl flex items-center justify-center text-[#9B897A]">
              <History size={24} />
            </div>
            <div>
              <span className="text-[#3A3129] font-medium text-lg leading-tight block">View<br/>History</span>
            </div>
          </button>
        </section>

        {/* Niche/Category Pills */}
        <section className="mb-8">
          <div className="px-6 mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#3A3129]">What kind of post?</h2>
          </div>
          <div className="flex gap-2 px-6 overflow-x-auto no-scrollbar pb-2">
            {["Coffee Shop", "Bakery", "Behind the Scenes", "Team", "Announcement", "Menu Item"].map((niche, i) => (
              <button 
                key={niche} 
                className={\`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors \${
                  i === 0 
                    ? "bg-[#E8B669] text-white shadow-sm shadow-[#E8B669]/20" 
                    : "bg-white text-[#6B5C4D] border border-[#F0E3D3] hover:bg-[#F8EFE4]"
                }\`}
              >
                {niche}
              </button>
            ))}
          </div>
        </section>

        {/* Recent Captions */}
        <section className="px-6 mb-8">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-semibold text-[#3A3129]">Recent Magic</h2>
            <button className="text-[#8C7A6B] text-sm font-medium flex items-center hover:text-[#E8B669] transition-colors">
              See all <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-[#F0E3D3] shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#E8B669] bg-[#E8B669]/10 px-2 py-1 rounded-md">
                  <Coffee size={10} />
                  New Menu
                </span>
                <span className="text-xs text-[#A6988C]">Yesterday</span>
              </div>
              <p className="text-[#5D5045] text-sm leading-relaxed line-clamp-2 mb-3">
                Pouring a little extra love into your morning cup today. ☕️ Have you tried our new honey lavender latte yet? It's basically a hug in a mug.
              </p>
              <div className="flex gap-2">
                <span className="text-xs text-[#8C7A6B]">#MorningCoffee</span>
                <span className="text-xs text-[#8C7A6B]">#LocalCafe</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#F0E3D3] shadow-sm relative">
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#A6988C] bg-[#F8EFE4] px-2 py-1 rounded-md">
                  Behind the scenes
                </span>
                <span className="text-xs text-[#A6988C]">2 days ago</span>
              </div>
              <p className="text-[#5D5045] text-sm leading-relaxed line-clamp-2 mb-3">
                The mess before the magic happens! ✨ Here's a peek at what our kitchen looks like at 5 AM. We wouldn't have it any other way.
              </p>
              <div className="flex gap-2">
                <span className="text-xs text-[#8C7A6B]">#BakingLife</span>
                <span className="text-xs text-[#8C7A6B]">#SmallBiz</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Nav Mock */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-[#F0E3D3] px-8 flex justify-between items-center pb-4">
        <button className="flex flex-col items-center gap-1 text-[#E8B669]">
          <PenTool size={24} fill="currentColor" className="opacity-20" />
          <span className="text-[10px] font-medium">Create</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A6988C]">
          <History size={24} />
          <span className="text-[10px] font-medium">History</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#A6988C]">
          <Hash size={24} />
          <span className="text-[10px] font-medium">Hashtags</span>
        </button>
      </div>
    </div>
  );
}
