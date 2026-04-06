"use client";

import { Language } from "@/types";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function LanguageToggle({ language, setLanguage }: Props) {
  const isAmharic = language === "amharic";

  return (
    <button
      onClick={() => setLanguage(isAmharic ? "english" : "amharic")}
      className="flex items-center gap-1 p-1 rounded-full bg-surface-glass backdrop-blur-md border border-border-subtle hover:bg-surface-hover transition-all duration-200 group shrink-0 shadow-sm"
      aria-label="Toggle language"
    >
      <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${isAmharic ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
        <span className="text-[10px] font-bold">አማ</span>
      </div>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${!isAmharic ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
        <span className="text-[10px] font-bold">EN</span>
      </div>
    </button>
  );
}
