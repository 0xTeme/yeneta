"use client";

import { Volume2 } from "lucide-react";
import { speakText } from "@/lib/speech";
import { Language } from "@/types";

interface Props {
  text: string;
  language: Language;
}

export default function SpeakButton({ text, language }: Props) {
  return (
    <button
      onClick={() => speakText(text, language)}
      className="p-1.5 text-gray-400 hover:text-[#1a7a4c] transition-colors rounded-full hover:bg-gray-100"
      title="Listen"
      aria-label="Speak text"
    >
      <Volume2 size={18} />
    </button>
  );
}
