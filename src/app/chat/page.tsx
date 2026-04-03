"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, ChatSession } from "@/types";
import { Loader2 } from "lucide-react";
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
  const [sessionsList, setSessionsList] = useState<any[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      const all = getAllSessions();
      setSessionsList(all);
      if (all.length > 0) handleLoadSession(all[0].id);
      else handleNewSession();
    }
  }, [status]);

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const existingSession = getSession(currentSessionId);
      const session: ChatSession = {
        id: currentSessionId,
        title: existingSession?.title || "New Chat",
        messages,
        language,
        createdAt: existingSession?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(session);
      setSessionsList(getAllSessions());
    }
  }, [messages, currentSessionId, language]);

  if (status === "loading" || status === "unauthenticated") return null;

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

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
    }
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return;
    const newHistory = messages.slice(0, index);
    setMessages(newHistory);
    handleSendMessage(newText, undefined, newHistory);
  };

  const handleSendMessage = async (text: string, stagedFile?: File, customHistory?: Message[]) => {
    const historyToUse = customHistory || messages;
    
    // If user sent a staged file from the quick-attach input, route it to document handler
    if (stagedFile) {
      await handleProcessDocument(stagedFile, "explain"); // defaults to explain action
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now(), type: "text" };
    const assistantId = (Date.now() + 1).toString();
    
    // Insert empty streaming assistant message
    setMessages([...historyToUse, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), type: "text", isStreaming: true } as any]);
    setIsTyping(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, history: historyToUse }),
        signal: abortControllerRef.current.signal
      });

      if (!res.body) throw new Error("No stream body returned from API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        fullText += chunkValue;

        // Update the streaming message in real-time
        setMessages((prev) => 
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: "Error generating response." } : m));
      }
    } finally {
      setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
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

    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: actionMap[action], timestamp: Date.now(), type: isImage ? "image" : "document", fileName: file.name }]);
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
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: JSON.stringify(data.quiz), timestamp: Date.now(), type: "quiz" }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: data.explanation || data.response || "Done.", timestamp: Date.now(), type: "text" }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: "Failed to process the file.", timestamp: Date.now(), type: "text" }]);
    } finally {
      setIsProcessingDoc(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar 
        sessions={sessionsList} currentSessionId={currentSessionId}
        onSelect={handleLoadSession} onNew={handleNewSession} onDelete={handleDeleteSession}
        language={language} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col w-full h-full relative">
        <div className="md:block pl-12 md:pl-0">
          <Navbar language={language} setLanguage={setLanguage} onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
        <ChatWindow
          messages={messages} language={language} isTyping={isTyping && !messages.some(m => (m as any).isStreaming)}
          showUpload={showUpload} setShowUpload={setShowUpload}
          onProcessDocument={handleProcessDocument} isUploading={isProcessingDoc}
          onRetry={(id) => { /* Retry logic uses edit logic under hood now */ handleEditMessage(id, messages[messages.findIndex(m=>m.id===id)-1]?.content || "") }}
          onEditMessage={handleEditMessage}
        />
        <ChatInput
          onSend={handleSendMessage} onToggleUpload={() => setShowUpload(!showUpload)}
          language={language} isLoading={isTyping || isProcessingDoc} onStopGeneration={stopGeneration}
        />
      </div>
    </div>
  );
}
