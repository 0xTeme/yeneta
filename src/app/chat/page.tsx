"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, ChatSession } from "@/types";
import { Loader2, Menu } from "lucide-react";

import { getAllSessions, getSession, saveSession, createNewSession, deleteSession } from "@/lib/storage";

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      const all = getAllSessions();
      setSessionsList(all);
      if (all.length > 0) {
        handleLoadSession(all[0].id);
      } else {
        handleNewSession();
      }
    }
  }, [status]);

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const session: ChatSession = {
        id: currentSessionId,
        title: sessionsList.find(s => s.id === currentSessionId)?.title || "New Chat",
        messages,
        language,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(session);
      setSessionsList(getAllSessions());
    }
  }, [messages, currentSessionId, language]);

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-[#1a7a4c]">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-bold animate-pulse">Loading Yeneta...</p>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const handleNewSession = () => {
    const newSession = createNewSession(language);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setSessionsList(getAllSessions());
  };

  const handleLoadSession = (id: string) => {
    const session = getSession(id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setLanguage(session.language || "amharic");
    }
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = getAllSessions();
    setSessionsList(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) handleLoadSession(updated[0].id);
      else handleNewSession();
    }
  };

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, {
      ...msg,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    }]);
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
      addMessage({ role: "assistant", content: data.reply || "Done.", type: "text" });
    } catch (error) {
      addMessage({ role: "assistant", content: language === "amharic" ? "ይቅርታ, ስህተት ተፈጥሯል።" : "An error occurred.", type: "text" });
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async (messageId: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex <= 0) return;
    
    const userMessage = messages[msgIndex - 1];
    if (userMessage.role !== "user") return;
    
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage.content, 
          language, 
          history: messages.slice(0, msgIndex - 1) 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addMessage({ role: "assistant", content: data.reply || "Error", type: "text" });
    } catch {
      addMessage({ role: "assistant", content: language === "amharic" ? "ይቅርታ, ስህተት ተፈጥሯል።" : "Error occurred.", type: "text" });
    } finally {
      setIsTyping(false);
    }
  };

  const handleProcessDocument = async (file: File, action: DocumentAction) => {
    setIsProcessingDoc(true);
    setShowUpload(false);

    const isImage = file.type.startsWith("image/");
    const endpoint = isImage ? "/api/upload" : "/api/document";
    const actionMap = {
      explain: language === "amharic" ? "ይህን አስረዳኝ" : "Explain this",
      summarize: language === "amharic" ? "ይህን አጠቃልልኝ" : "Summarize this",
      quiz: language === "amharic" ? "በዚህ ፈትነኝ" : "Quiz me on this",
    };

    addMessage({ role: "user", content: actionMap[action], type: isImage ? "image" : "document", fileName: file.name });
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append(isImage ? "image" : "document", file);
      formData.append("language", language);
      if (!isImage) formData.append("action", action);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data: ApiResponse = await res.json();
      if (data.error) throw new Error(data.error);

      if (action === "quiz" && data.quiz) {
        addMessage({ role: "assistant", content: JSON.stringify(data.quiz), type: "quiz" });
      } else {
        addMessage({ role: "assistant", content: data.explanation || data.response || "Done.", type: "text" });
      }
    } catch (error) {
      addMessage({ role: "assistant", content: language === "amharic" ? "ፋይሉን ማንበብ አልተቻለም።" : "Failed to process the file.", type: "text" });
    } finally {
      setIsProcessingDoc(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar 
        sessions={sessionsList}
        currentSessionId={currentSessionId}
        onSelect={handleLoadSession}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
        language={language}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col w-full h-full relative">
        <div className="md:hidden absolute top-3 left-4 z-50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="md:block pl-14 md:pl-0">
          <Navbar language={language} setLanguage={setLanguage} />
        </div>

        <ChatWindow
          messages={messages} language={language} isTyping={isTyping}
          showUpload={showUpload} setShowUpload={setShowUpload}
          onProcessDocument={handleProcessDocument} isUploading={isProcessingDoc}
          onRetry={handleRetry}
        />
        
        <ChatInput
          onSend={handleSendMessage} onToggleUpload={() => setShowUpload(!showUpload)}
          language={language} isLoading={isTyping || isProcessingDoc}
        />
      </div>
    </div>
  );
}