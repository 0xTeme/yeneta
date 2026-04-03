"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { Message, Language, DocumentAction, ApiResponse } from "@/types";

export default function ChatPage() {
  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...msg,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async (text: string) => {
    addMessage({ role: "user", content: text, type: "text" });
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, history: messages }),
      });

      const data: ApiResponse = await res.json();
      
      if (data.error) throw new Error(data.error);

      addMessage({
        role: "assistant",
        content: data.reply || "I couldn't process that.",
        type: "text"
      });
    } catch (error) {
      console.error(error);
      addMessage({
        role: "assistant",
        content: language === "amharic" ? "ይቅርታ, ስህተት ተፈጥሯል።" : "Sorry, an error occurred.",
        type: "text"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleProcessDocument = async (file: File, action: DocumentAction) => {
    setIsProcessingDoc(true);
    setShowUpload(false);

    const isImage = file.type.startsWith("image/");
    const endpoint = isImage ? "/api/upload" : "/api/document";

    const actionTextMap = {
      explain: language === "amharic" ? "ይህን አስረዳኝ" : "Explain this",
      summarize: language === "amharic" ? "ይህን አጠቃልልኝ" : "Summarize this",
      quiz: language === "amharic" ? "በዚህ ፈትነኝ" : "Quiz me on this",
    };

    addMessage({
      role: "user",
      content: actionTextMap[action],
      type: isImage ? "image" : "document",
      fileName: file.name,
    });

    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append(isImage ? "image" : "document", file);
      formData.append("language", language);
      if (!isImage) {
        formData.append("action", action);
      }

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data: ApiResponse = await res.json();

      if (data.error) throw new Error(data.error);

      if (action === "quiz" && data.quiz) {
        addMessage({
          role: "assistant",
          content: JSON.stringify(data.quiz),
          type: "quiz"
        });
      } else {
        addMessage({
          role: "assistant",
          content: data.explanation || data.response || "Done.",
          type: "text"
        });
      }
    } catch (error) {
      console.error(error);
      addMessage({
        role: "assistant",
        content: language === "amharic" ? "ፋይሉን ማንበብ አልተቻለም።" : "Failed to process the file.",
        type: "text"
      });
    } finally {
      setIsProcessingDoc(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Navbar language={language} setLanguage={setLanguage} />
      
      <ChatWindow
        messages={messages}
        language={language}
        isTyping={isTyping}
        showUpload={showUpload}
        setShowUpload={setShowUpload}
        onProcessDocument={handleProcessDocument}
        isUploading={isProcessingDoc}
      />

      <ChatInput
        onSend={handleSendMessage}
        onToggleUpload={() => setShowUpload((prev) => !prev)}
        language={language}
        isLoading={isTyping || isProcessingDoc}
      />
    </div>
  );
}
