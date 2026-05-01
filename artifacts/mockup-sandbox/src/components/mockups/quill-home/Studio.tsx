import React from "react";
import { Feather, Sparkles, Instagram, Linkedin, Twitter, Plus, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Studio() {
  return (
    <div
      style={{ width: 390, minHeight: 844, overflow: "auto" }}
      className="bg-[#0b090f] text-slate-100 relative font-sans selection:bg-purple-500/30 overflow-x-hidden"
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}} />
      <div className="font-outfit pb-24">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[390px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[20%] right-[-20%] w-[200px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <header className="px-6 pt-14 pb-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
              <Feather size={16} className="text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Quill</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-50">47 created</span>
          </div>
        </header>

        {/* Greeting */}
        <section className="px-6 pt-4 pb-8 relative z-10">
          <h1 className="text-3xl font-light text-slate-300 mb-1">
            Good morning, <span className="font-semibold text-white">Sarah</span>
          </h1>
          <p className="text-sm text-slate-400">Ready to command your audience?</p>
        </section>

        {/* Primary Action */}
        <section className="px-6 mb-10 relative z-10">
          <button className="w-full relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-20 w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-[1px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-full h-full bg-[#130f1c] rounded-[15px] flex items-center justify-between px-6 transition-all duration-300 group-hover:bg-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Sparkles size={20} className="text-purple-300 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-semibold text-white group-hover:text-white mb-0.5">Generate Captions</div>
                    <div className="text-xs text-purple-300/80 group-hover:text-purple-100">AI-powered studio</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20">
                  <Plus size={18} className="text-white" />
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* Quick Select */}
        <section className="px-6 mb-10 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Quick Format</h2>
          </div>
          <div className="flex gap-3">
            {[
              { icon: Instagram, label: "Instagram", color: "from-pink-500 to-orange-400" },
              { icon: Linkedin, label: "LinkedIn", color: "from-blue-600 to-blue-400" },
              { icon: Twitter, label: "Twitter", color: "from-sky-500 to-sky-400" },
            ].map((platform, i) => (
              <button key={i} className="flex-1 h-24 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors">
                <div className={cn("w-10 h-10 rounded-full bg-gradient-to-tr flex items-center justify-center opacity-80", platform.color)}>
                  <platform.icon size={20} className="text-white" />
                </div>
                <span className="text-xs font-medium text-slate-300">{platform.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent History */}
        <section className="px-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Recent Creations</h2>
            <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center">
              View all <ChevronRight size={14} className="ml-0.5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {[
              { 
                platform: Instagram, 
                color: "text-pink-400", 
                bg: "bg-pink-400/10",
                text: "✨ Exciting news! We're launching our new summer collection next week. Get ready for...",
                time: "2h ago"
              },
              { 
                platform: Linkedin, 
                color: "text-blue-400", 
                bg: "bg-blue-400/10",
                text: "The future of remote work isn't just about tools, it's about culture. Here are 3 ways we...",
                time: "Yesterday"
              },
              { 
                platform: Twitter, 
                color: "text-sky-400", 
                bg: "bg-sky-400/10",
                text: "Just shipped a massive update to our core platform. 🚀 Performance is up 40%...",
                time: "Oct 12"
              }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#16121f] border border-white/5 hover:border-purple-500/30 transition-colors group cursor-pointer flex gap-4 items-start">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", item.bg)}>
                  <item.platform size={14} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-2">
                    {item.text}
                  </p>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
