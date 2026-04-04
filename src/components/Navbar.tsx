"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Language } from "@/types";
import LanguageToggle from "./LanguageToggle";
import { GraduationCap, Menu, Square, Moon, Sun } from "lucide-react";
import { subscribeToTTS, stopSpeaking } from "@/lib/speech";
import { useTheme } from "next-themes";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
  onMenuClick?: () => void;
}

export default function Navbar({ language, setLanguage, onMenuClick }: Props) {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = subscribeToTTS(setIsAudioPlaying);
    return () => { unsubscribe(); };
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 text-gray-600 hover:bg-gray-100 hover:text-[#1a7a4c] rounded-lg transition-colors">
            <Menu size={24} />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-[#1a7a4c] p-2 rounded-lg group-hover:bg-[#135c39] transition-colors">
            <GraduationCap className="text-white" size={24} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-[#1a1a2e] leading-none">የኔታ</h1>
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Yeneta</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        
        {isAudioPlaying && (
          <button 
            onClick={stopSpeaking} 
            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-[#e63946] border border-red-200 rounded-full hover:bg-red-200 transition-colors animate-pulse text-xs font-bold"
          >
            <Square size={12} fill="currentColor" /> Stop Audio
          </button>
        )}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <LanguageToggle language={language} setLanguage={setLanguage} />
      </div>
    </nav>
  );
}