"use client";

import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speakText, stopSpeaking, subscribeToTTS } from "@/lib/speech";
import { Language } from "@/types";

export default function SpeakButton({ text, language }: { text: string; language: Language }) {
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
      await speakText(text, language, "female");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 transition-colors rounded-full shadow ${
        isThisSpecificButtonPlaying ? "text-red-500 bg-red-50 border border-red-100" : "text-gray-400 hover:text-[#1a7a4c] bg-white border border-gray-100"
      }`}
    >
      {isThisSpecificButtonPlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
    </button>
  );
}