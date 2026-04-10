"use client";

import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speakText, stopSpeaking, subscribeToTTS } from "@/lib/speech";

export default function SpeakButton({ text, gender }: { text: string; gender: "male" | "female" }) {
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(false);
  const [isThisSpecificButtonPlaying, setIsThisSpecificButtonPlaying] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToTTS((playing) => {
      setIsGloballyPlaying(playing);
      if (!playing) setIsThisSpecificButtonPlaying(false);
    });
    return () => { unsubscribe(); };
  }, []);

  const handleToggle = async () => {
    if (isGloballyPlaying) {
      stopSpeaking();
    } else {
      setIsThisSpecificButtonPlaying(true);
      const detectedLanguage = /[ሀ-፿]/.test(text) ? "amharic" : "english";
      await speakText(text, detectedLanguage, gender);
    }
  };

  const isPlaying = isGloballyPlaying || isThisSpecificButtonPlaying;

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-lg shadow transition-all ${
        isPlaying 
          ? "bg-error-base text-white border-2 border-error-hover hover:bg-error-hover animate-pulse" 
          : "text-gray-400 hover:text-[#1a7a4c] bg-white border border-gray-100 hover:bg-surface-hover"
      }`}
    >
      {isPlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
    </button>
  );
}