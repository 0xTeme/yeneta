"use client";

import { useEffect, useRef, memo } from "react";
import { Message, Language, DocumentAction } from "@/types";
import MessageBubble from "./MessageBubble";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  messages: Message[];
  language: Language;
  aiVoice: "male" | "female";
  isTyping: boolean;
  showUpload: boolean;
  setShowUpload: (val: boolean) => void;
  onProcessDocument: (file: File, action: DocumentAction, questionCount?: number) => void;
  isUploading: boolean;
  onRetry: (messageId: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onTranslate?: (messageId: string, text: string) => void;
}

const ChatWindow = memo(function ChatWindow({ messages, language, aiVoice, isTyping, showUpload, setShowUpload, onProcessDocument, isUploading, onRetry, onEditMessage, onTranslate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Only auto-scroll if user is within 150px of bottom
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar py-8 px-4 md:px-8 relative z-0 flex flex-col items-center gpu-accelerated overscroll-none">
      {messages.length === 0 ? (
        <div className="h-full w-full max-w-3xl flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center shadow-sm border border-border-subtle">
            <Sparkles size={40} className="fill-current text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-content tracking-tight font-headline">
              {language === "amharic" ? "የኔታን ማንኛውንም ጥያቄ ይጠይቁ…" : "Ask Yeneta anything…"}
            </h3>
            <p className="text-content-muted max-w-xs mx-auto text-sm font-label">
              {language === "amharic" 
                ? "የእርስዎ የግል አስተማሪ እና ጥልቅ እውቀት ያለው የትምህርት አጋር።" 
                : "Your personal tutor and educational companion powered by deep intelligence."}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md pt-8">
            <div className="p-4 rounded-xl bg-surface border border-border-subtle hover:bg-surface-hover transition-all text-left text-sm cursor-default group">
              <span className="block text-primary font-bold mb-1">{language === "amharic" ? "አስረዳኝ" : "Explain"}</span>
              <span className="text-content-muted group-hover:text-content transition-colors">{language === "amharic" ? "የኳንተም ፊዚክስን በቀላል ቋንቋ..." : "Quantum physics in simple terms..."}</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle hover:bg-surface-hover transition-all text-left text-sm cursor-default group">
              <span className="block text-primary font-bold mb-1">{language === "amharic" ? "ተንትን" : "Analyze"}</span>
              <span className="text-content-muted group-hover:text-content transition-colors">{language === "amharic" ? "ይህን ሰነድ ለዋና ዋና ነጥቦች..." : "This document for key insights..."}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col space-y-6 pb-6">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              language={language} 
              aiVoice={aiVoice} 
              onRetry={onRetry} 
              onEdit={onEditMessage} 
              onTranslate={onTranslate} 
            />
          ))}
          {/* This loader now triggers during file uploads before the stream begins */}
          {isTyping && (
            <div className="flex flex-col items-start space-y-2 w-full my-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-content-inverse text-[10px] font-bold shadow-sm">Y</div>
                <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-widest font-label">
                  {language === "amharic" ? "የኔታ" : "Yeneta Assistant"}
                </span>
              </div>
              <div className="bg-surface-glass backdrop-blur-md border border-border-subtle rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center gap-3 w-max">
                <Loader2 size={20} className="text-primary animate-spin" />
                <span className="text-primary text-sm font-bold tracking-wide font-headline">
                  {language === "amharic" ? "በማስኬድ ላይ..." : "Processing..."}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      )}
    </div>
  );
});

export default ChatWindow;
