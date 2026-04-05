"use client";

import { Language } from "@/types";

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export default function LanguageToggle({ language, setLanguage }: Props) {
  const isAmharic = language === "amharic";

  return (
    <div className="flex items-center bg-surface border border-border-strong rounded-full p-1 w-24 relative cursor-pointer" 
         onClick={() => setLanguage(isAmharic ? "english" : "amharic")}>
      <div
        className={`absolute w-1/2 h-7 bg-surface-hover border border-border-subtle rounded-full shadow-sm transition-transform duration-300 ${
          isAmharic ? "translate-x-0" : "translate-x-full"
        }`}
      />
      <span className={`w-1/2 text-center z-10 text-sm font-semibold transition-colors ${isAmharic ? "text-primary" : "text-content-muted"}`}>
        አማ
      </span>
      <span className={`w-1/2 text-center z-10 text-sm font-semibold transition-colors ${!isAmharic ? "text-primary" : "text-content-muted"}`}>
        EN
      </span>
    </div>
  );
}
