"use client";

import { useState } from "react";
import { Send, Mic, Paperclip, Loader2 } from "lucide-react";
import { Language } from "@/types";
import { startListening } from "@/lib/speech";

interface Props {
  onSend: (message: string) => void;
  onToggleUpload: () => void;
  language: Language;
  isLoading: boolean;
}

export default function ChatInput({ onSend, onToggleUpload, language, isLoading }: Props) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (isListening) return;

    setIsListening(true);
    startListening(
      language,
      (transcript) => {
        setText((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      },
      (error) => {
        console.error("Speech recognition error:", error);
        setIsListening(false);
      }
    );
  };

  const isAmharic = language === "amharic";

  return (
    <div className="bg-white border-t p-4 flex items-center gap-2 sticky bottom-0 z-20">
      <button
        onClick={onToggleUpload}
        className="p-3 text-gray-500 hover:text-[#1a7a4c] hover:bg-green-50 rounded-full transition-colors shrink-0"
        title={isAmharic ? "ፋይል ስቀል" : "Upload File"}
      >
        <Paperclip size={20} />
      </button>

      <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 border border-transparent focus-within:border-[#1a7a4c] transition-colors">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAmharic ? "ጥያቄዎን ያስገቡ..." : "Ask a question..."}
          className="flex-1 bg-transparent outline-none text-[#1a1a2e] placeholder-gray-500"
          disabled={isLoading}
        />
        <button
          onClick={toggleMic}
          className={`p-2 rounded-full transition-colors ${
            isListening ? "text-[#e63946] animate-pulse" : "text-gray-400 hover:text-[#1a7a4c]"
          }`}
          title={isAmharic ? "በድምጽ አስገባ" : "Voice input"}
        >
          <Mic size={18} />
        </button>
      </div>

      <button
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="p-3 bg-[#1a7a4c] text-white rounded-full hover:bg-[#135c39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
      </button>
    </div>
  );
}
