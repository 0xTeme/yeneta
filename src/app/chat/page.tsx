"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse } from "@/types";
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

  // Layout & Settings States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  const [userGender, setUserGender] = useState<"male"|"female"|null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);

  // Session States
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<any[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth Protection
  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);

  // Load Gender preference
  useEffect(() => {
    const savedGender = localStorage.getItem("yeneta_gender") as "male"|"female"|null;
    if (savedGender) setUserGender(savedGender);
    else setShowGenderModal(true);
  }, []);

  const saveGender = (g: "male" | "female") => {
    localStorage.setItem("yeneta_gender", g);
    setUserGender(g);
    setShowGenderModal(false);
  };

  // Load Chat Sessions
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
      saveSession({
        id: currentSessionId,
        messages,
        language,
        createdAt: existingSession?.createdAt || Date.now(),
        updatedAt: Date.now(),
        title: existingSession?.title || "New Chat"
      });
      setSessionsList(getAllSessions());
    }
  }, [messages, currentSessionId, language]);

  if (status === "loading" || status === "unauthenticated") return null;

  // Session Handlers
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
    
    if (stagedFile) {
      await handleProcessDocument(stagedFile, "explain");
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now(), type: "text" };
    const assistantId = (Date.now() + 1).toString();
    
    setMessages([...historyToUse, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), type: "text", isStreaming: true } as any]);
    setIsTyping(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, history: historyToUse, userGender }), // Sent user gender to API
        signal: abortControllerRef.current.signal
      });

      if (!res.body) throw new Error("No stream body returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        fullText += chunkValue;

        setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
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
      formData.append("userGender", userGender || "female"); // Included in docs upload too

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
    <div className="flex h-screen overflow-hidden bg-white relative font-noto">
      
      {/* Gender Modal */}
      {showGenderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 text-[#1a7a4c] flex items-center justify-center rounded-full mx-auto mb-4 text-3xl">🎓</div>
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Welcome to Yeneta <br/><span className="text-[#1a7a4c]">እንኳን በደህና መጡ</span></h2>
            <p className="text-gray-500 mb-6 text-sm">To provide personalized Amharic responses, please select your gender. <br/>ትክክለኛ የአማርኛ ምላሽ ለመስጠት፣ እባክዎ ጾታዎን ይምረጡ።</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => saveGender("male")} className="px-6 py-3 border-2 border-gray-200 rounded-xl hover:border-[#1a7a4c] hover:bg-green-50 font-bold text-[#1a1a2e] transition-all">Male / ወንድ</button>
              <button onClick={() => saveGender("female")} className="px-6 py-3 border-2 border-gray-200 rounded-xl hover:border-[#1a7a4c] hover:bg-green-50 font-bold text-[#1a1a2e] transition-all">Female / ሴት</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop & Mobile */}
      <div className={`${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full"} transition-all duration-300 ease-in-out shrink-0 bg-[#1a1a2e] absolute md:relative z-40 h-full`}>
        <div className="w-64 h-full">
          <Sidebar 
            sessions={sessionsList} currentSessionId={currentSessionId}
            onSelect={handleLoadSession} onNew={handleNewSession} onDelete={handleDeleteSession}
            language={language} isOpen={true} setIsOpen={setIsSidebarOpen} 
          />
        </div>
      </div>
      
      {/* Mobile overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar 
          language={language} 
          setLanguage={setLanguage} 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        <ChatWindow
          messages={messages} language={language} isTyping={isTyping && !messages.some(m => (m as any).isStreaming)}
          showUpload={showUpload} setShowUpload={setShowUpload}
          onProcessDocument={handleProcessDocument} isUploading={isProcessingDoc}
          onRetry={(id) => handleEditMessage(id, messages[messages.findIndex(m=>m.id===id)-1]?.content || "")}
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