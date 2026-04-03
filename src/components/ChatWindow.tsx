"use client";

import { useEffect, useRef } from "react";
import { Message, Language, DocumentAction } from "@/types";
import MessageBubble from "./MessageBubble";
import DocumentUpload from "./DocumentUpload";

interface Props {
  messages: Message[];
  language: Language;
  isTyping: boolean;
  showUpload: boolean;
  setShowUpload: (val: boolean) => void;
  onProcessDocument: (file: File, action: DocumentAction) => void;
  isUploading: boolean;
  onRetry: (messageId: string) => void;
}

export default function ChatWindow({ 
  messages, 
  language, 
  isTyping, 
  showUpload, 
  setShowUpload,
  onProcessDocument,
  isUploading,
  onRetry
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showUpload]);

  const isAmharic = language === "amharic";

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-50">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🎓</span>
          </div>
          <h2 className="text-xl font-bold text-[#1a1a2e]">
            {isAmharic ? "ሰላም! እኔ የኔታ ነኝ።" : "Hello! I am Yeneta."}
          </h2>
          <p className="max-w-sm">
            {isAmharic 
              ? "ምን ላግዝዎት? ጥያቄ ይጠይቁኝ ወይም ማጥኛ ፋይሎችን ይስቀሉ።" 
              : "How can I help you? Ask a question or upload study materials."}
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto flex flex-col w-full pb-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} language={language} onRetry={onRetry} />
          ))}

          {isTyping && (
            <div className="flex justify-start my-3">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex gap-1">
                <div className="w-2 h-2 bg-[#1a7a4c] rounded-full typing-dot" />
                <div className="w-2 h-2 bg-[#1a7a4c] rounded-full typing-dot" />
                <div className="w-2 h-2 bg-[#1a7a4c] rounded-full typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      )}

      {showUpload && (
        <div className="fixed sm:absolute bottom-20 sm:bottom-4 left-0 right-0 max-w-lg mx-auto w-full px-4 z-30">
          <DocumentUpload language={language} onClose={() => setShowUpload(false)} onProcess={onProcessDocument} isProcessing={isUploading} />
        </div>
      )}
    </div>
  );
}