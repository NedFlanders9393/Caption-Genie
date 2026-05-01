import React from "react";
import { Feather, Hash, History, Sparkles, ChevronRight, Flame, Copy, Tag } from "lucide-react";

export function Companion() {
  return (
    <div
      style={{ width: 390, minHeight: 844, overflow: "auto" }}
      className="bg-[#FFFDF9] text-[#4A3F35] relative pb-24"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        .companion-wrap { font-family: 'Outfit', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="companion-wrap">

        {/* ── Header ── */}
        <header className="px-6 pt-12 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8B669] flex items-center justify-center text-white shadow-sm">
              <Feather size={15} />
            </div>
            <span className="font-semibold text-xl tracking-tight text-[#3A3129]">Quill</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5ECE0] border-2 border-white overflow-hidden shadow-sm">
            <img src="https://i.pravatar.cc/150?u=sarah" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </header>

        {/* ── Greeting + Streak inline ── */}
        <section className="px-6 pt-5 pb-6">
          <p className="text-[#8C7A6B] text-sm font-medium mb-1">Good morning, Sarah</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-[28px] font-bold text-[#3A3129] leading-tight">
              Ready to create<br />something wonderful?
            </h1>
            {/* Streak badge — right-aligned, compact */}
            <div className="flex-shrink-0 bg-[#F8EFE4] border border-[#F0E3D3] rounded-2xl px-3 py-2 flex flex-col items-center gap-0.5">
              <Flame size={18} className="text-[#E8824A]" />
              <span className="text-[11px] font-bold text-[#5D5045] leading-none">3</span>
              <span className="text-[9px] text-[#8C7A6B] leading-none">day streak</span>
            </div>
          </div>
        </section>

        {/* ── Quick Actions — all 3 visible, equal width ── */}
        <section className="px-4 mb-7">
          <div className="flex gap-2">

            {/* Write a Caption — primary dark tile, single icon */}
            <button className="flex-1 h-[148px] bg-[#3A3129] rounded-3xl p-4 flex flex-col justify-between items-start text-left shadow-md">
              <div className="w-10 h-10 bg-[#E8B669] rounded-2xl flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-white font-semibold text-base leading-tight">
                Write a<br />Caption
              </span>
            </button>

            {/* Find Hashtags */}
            <button className="flex-1 h-[148px] bg-white rounded-3xl p-4 flex flex-col justify-between items-start text-left border border-[#F0E3D3] shadow-sm">
              <div className="w-10 h-10 bg-[#F8EFE4] rounded-2xl flex items-center justify-center">
                <Hash size={20} className="text-[#9B897A]" />
              </div>
              <span className="text-[#3A3129] font-semibold text-base leading-tight">
                Find<br />Hashtags
              </span>
            </button>

            {/* View History */}
            <button className="flex-1 h-[148px] bg-white rounded-3xl p-4 flex flex-col justify-between items-start text-left border border-[#F0E3D3] shadow-sm">
              <div className="w-10 h-10 bg-[#F8EFE4] rounded-2xl flex items-center justify-center">
                <History size={20} className="text-[#9B897A]" />
              </div>
              <span className="text-[#3A3129] font-semibold text-base leading-tight">
                View<br />History
              </span>
            </button>

          </div>
        </section>

        {/* ── Tip callout — below actions so utility comes first ── */}
        <section className="px-4 mb-7">
          <div className="bg-[#F8EFE4] rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#F0E3D3]">
            <Flame size={16} className="text-[#E8824A] flex-shrink-0" />
            <p className="text-[#5D5045] text-xs leading-relaxed">
              <span className="font-semibold">Tip:</span> Tuesday posts with a question in the caption get 2× more engagement.
            </p>
          </div>
        </section>

        {/* ── Recent Magic — the main content, prominent ── */}
        <section className="px-4 mb-6">
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-base font-bold text-[#3A3129]">Recent Magic</h2>
            <button className="text-[#8C7A6B] text-xs font-medium flex items-center gap-0.5">
              See all <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-4 border border-[#F0E3D3] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#E8B669] bg-[#FDF3E3] px-2 py-1 rounded-md">
                    <Tag size={9} />
                    New Menu
                  </span>
                  <span className="text-[10px] text-[#C4B5A8] font-medium">Instagram</span>
                </div>
                <button className="text-[#C4B5A8] hover:text-[#9B897A]">
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[#5D5045] text-sm leading-relaxed line-clamp-2 mb-2.5">
                Pouring a little extra love into your morning cup today. Have you tried our new honey lavender latte yet? It's basically a hug in a mug.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs text-[#B0A090]">#MorningCoffee</span>
                  <span className="text-xs text-[#B0A090]">#LocalCafe</span>
                </div>
                <span className="text-[10px] text-[#C4B5A8]">Yesterday</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-4 border border-[#F0E3D3] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#9B897A] bg-[#F5EDE4] px-2 py-1 rounded-md">
                    <Tag size={9} />
                    Behind Scenes
                  </span>
                  <span className="text-[10px] text-[#C4B5A8] font-medium">TikTok</span>
                </div>
                <button className="text-[#C4B5A8] hover:text-[#9B897A]">
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[#5D5045] text-sm leading-relaxed line-clamp-2 mb-2.5">
                The mess before the magic happens! Here's a peek at what our kitchen looks like at 5 AM. We wouldn't have it any other way.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs text-[#B0A090]">#BakingLife</span>
                  <span className="text-xs text-[#B0A090]">#SmallBiz</span>
                </div>
                <span className="text-[10px] text-[#C4B5A8]">2 days ago</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── Bottom Nav ── */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-[#F0E3D3] px-8 flex justify-between items-center pb-4">
        <button className="flex flex-col items-center gap-1 text-[#E8B669]">
          <Feather size={22} />
          <span className="text-[10px] font-semibold">Create</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#C4B5A8]">
          <History size={22} />
          <span className="text-[10px] font-medium">History</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#C4B5A8]">
          <Hash size={22} />
          <span className="text-[10px] font-medium">Hashtags</span>
        </button>
      </div>
    </div>
  );
}
