"use client";

import { useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/speech";
import { Language } from "@/types";

export default function SpeakButton({ text, language }: { text: string; language: Language }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggle = async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await speakText(text, language, "female");
      } finally {
        setIsPlaying(false);
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 transition-colors rounded-full shadow ${
        isPlaying ? "text-red-500 bg-red-50 border border-red-100" : "text-gray-400 hover:text-[#1a7a4c] bg-white border border-gray-100"
      }`}
    >
      {isPlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
    </button>
  );
}