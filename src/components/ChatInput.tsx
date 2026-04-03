"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Paperclip, Loader2 } from "lucide-react";
import { Language } from "@/types";
import { startListening } from "@/lib/speech";

interface Props {
  onSend: (message: string) => void;
  onToggleUpload: () => void;
  language: Language;
  isLoading: boolean;
}

export default function ChatInput({
  onSend,
  onToggleUpload,
  language,
  isLoading,
}: Props) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempText, setTempText] = useState("");
  
  const stopFnRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      const trimmedText = text.trim();
      onSend(trimmedText);
      
      setHistory((prev) => {
        const newHistory = [trimmedText, ...prev.filter(h => h !== trimmedText)].slice(0, 50);
        return newHistory;
      });
      
      setText("");
      setTempText("");
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      if (historyIndex === -1) {
        setTempText(text);
      }
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
      
      setTimeout(() => {
        inputRef.current?.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }, 0);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setText(tempText);
        return;
      }
      
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setText(history[newIndex]);
      
      setTimeout(() => {
        inputRef.current?.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }, 0);
      return;
    }
  };

  const toggleMic = () => {
    if (isListening) {
      if (stopFnRef.current) stopFnRef.current();
      setIsListening(false);
    } else {
      setIsListening(true);
      stopFnRef.current = startListening(
        language,
        (transcript) => {
          setText((prev) => prev + (prev ? " " : "") + transcript);
          setIsListening(false);
        },
        (error) => {
          console.error(error);
          setIsListening(false);
        }
      );
    }
  };

  const isAmharic = language === "amharic";

  return (
    <div className="bg-white border-t p-4 flex items-center gap-2 sticky bottom-0 z-20">
      <button
        onClick={onToggleUpload}
        className="p-3 text-gray-500 hover:text-[#1a7a4c] hover:bg-green-50 rounded-full transition-colors"
        title={isAmharic ? "ፋይል ስቀል" : "Upload File"}
      >
        <Paperclip size={20} />
      </button>

      <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 border focus-within:border-[#1a7a4c] transition-colors shadow-sm">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAmharic ? "ጥያቄዎን ያስገቡ... (ለማስታወስ ↑/↓ ይጠቀሙ)" : "Ask a question... (use ↑/↓ for history)"}
          className="flex-1 bg-transparent outline-none text-[#1a1a2e]"
          disabled={isLoading}
        />
        <button
          onClick={toggleMic}
          className={`p-2 rounded-full transition-colors ${
            isListening
              ? "text-[#e63946] bg-red-100 animate-pulse"
              : "text-gray-400 hover:text-[#1a7a4c]"
          }`}
          title={isAmharic ? "በድምጽ አስገባ" : "Voice Input"}
        >
          {isListening ? (
            <Square size={16} fill="currentColor" />
          ) : (
            <Mic size={18} />
          )}
        </button>
      </div>

      <button
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="p-3 bg-[#1a7a4c] text-white rounded-full hover:bg-[#135c39] disabled:opacity-50 transition-all shrink-0 shadow-sm hover:shadow active:scale-95"
        title={isAmharic ? "ላክ" : "Send"}
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Send size={20} />
        )}
      </button>
    </div>
  );
}