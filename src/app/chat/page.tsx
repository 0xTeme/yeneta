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

import { getAllSessions, getSession, saveSession, createNewSession, deleteSession, getFolders, addFolder, deleteFolder } from "@/lib/storage";

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userGender, setUserGender] = useState<"male"|"female"|null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);

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

  useEffect(() => {
    if (status === "authenticated") {
      const all = getAllSessions();
      setSessionsList(all);
      
      if (typeof getFolders === "function") setFoldersList(getFolders()); 
      
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
        title: existingSession?.title || "New Chat",
        folder: existingSession?.folder
      });
      setSessionsList(getAllSessions());
    }
  }, [messages, currentSessionId, language]);

  if (status === "loading" || status === "unauthenticated") return null;

  const handleNewSession = (folderName?: string) => {
    try {
      // @ts-ignore
      const newSession = createNewSession(language);
      if (folderName) newSession.folder = folderName;
      
      // @ts-ignore
      saveSession(newSession);
      setCurrentSessionId(newSession.id);
    } catch (e) {
      const id = Date.now().toString();
      setCurrentSessionId(id);
    }

    setMessages([]);
    setSessionsList(getAllSessions());
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLoadSession = (id: string) => {
    const session = getSession(id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
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

  const handleCreateFolder = (name: string) => {
    if (typeof addFolder === "function") {
      addFolder(name);
      setFoldersList(getFolders());
    }
  };

  const handleDeleteFolder = (name: string) => {
    if (typeof deleteFolder === "function") {
      deleteFolder(name);
      setFoldersList(getFolders());
      setSessionsList(getAllSessions());
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
        body: JSON.stringify({ message: text, language, history: historyToUse, userGender }),
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
      formData.append("userGender", userGender || "female");

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

      <div 
        className={`${isSidebarOpen ? "w-64" : "w-0"} transition-all duration-300 ease-in-out shrink-0 relative z-40 h-full overflow-hidden bg-[#1a1a2e] shadow-2xl md:shadow-none`}
      >
        <div className="w-64 h-full absolute inset-0">
          <Sidebar
            sessions={sessionsList} 
            folders={foldersList}
            currentSessionId={currentSessionId}
            onSelect={handleLoadSession} 
            onNew={handleNewSession} 
            onDelete={handleDeleteSession}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            language={language}
          />
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

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
