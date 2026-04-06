"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Language } from "@/types";
import LanguageToggle from "./LanguageToggle";
import { GraduationCap, Menu, Square, Moon, Sun, X } from "lucide-react";
import { subscribeToTTS, stopSpeaking } from "@/lib/speech";
import { useTheme } from "next-themes";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ language, setLanguage, onMenuClick, isSidebarOpen }: Props) {
  const[isAudioPlaying, setIsAudioPlaying] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true),[]);

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const unsubscribe = subscribeToTTS(setIsAudioPlaying);
    return () => { unsubscribe(); };
  },[]);

  return (
    <nav className="flex justify-between items-center px-4 md:px-6 w-full sticky top-3 mx-3 z-40 bg-surface/95 backdrop-blur-xl rounded-2xl h-[54px] shadow-lg border border-border-subtle/50">
      
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 text-content-muted hover:bg-surface-hover hover:text-content rounded-lg transition-colors active:scale-95 border border-transparent hover:border-border-subtle shrink-0">
            {isSidebarOpen ? <X size={24} className="transition-transform duration-200" /> : <Menu size={24} className="transition-transform duration-200" />}
          </button>
        )}
        
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="bg-primary p-2 rounded-xl shadow-sm border border-primary/20 group-hover:brightness-110 transition-all shrink-0">
            <GraduationCap className="text-content-inverse" size={24} />
          </div>
          <div className="flex flex-col justify-center truncate">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-content leading-none font-headline truncate">Yeneta</h1>
            <span className="hidden md:block text-[0.55rem] font-bold text-primary tracking-[0.2em] uppercase mt-0.5 font-label opacity-80 truncate">የኔታ</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {isAudioPlaying && (
          <button 
            onClick={stopSpeaking} 
            className="flex items-center gap-2 px-3 py-1.5 bg-error-muted text-error-text border border-error-base/50 rounded-full hover:bg-error-base/20 transition-colors animate-pulse text-[0.6875rem] font-bold tracking-wide shadow-sm"
          >
            <Square size={12} fill="currentColor" /> <span className="hidden sm:inline">Stop Audio</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={handleToggleTheme}
              className="flex items-center gap-1 p-1 rounded-full bg-surface-glass backdrop-blur-md border border-border-subtle hover:bg-surface-hover transition-all duration-200 group shrink-0 shadow-sm"
              aria-label="Toggle theme"
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${resolvedTheme !== "dark" ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
                <Sun size={14} />
              </div>
              <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${resolvedTheme === "dark" ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
                <Moon size={14} />
              </div>
            </button>
          )}

          <LanguageToggle language={language} setLanguage={setLanguage} />
        </div>
      </div>
    </nav>
  );
}
