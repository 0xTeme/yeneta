"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, UserProfileData } from "@/types";
import { Folder as FolderIcon } from "lucide-react";

import {
  getAllSessions,
  getSession,
  saveSession,
  createNewSession,
  deleteSession,
  getFolders,
  addFolder,
  deleteFolder,
  moveSessionToFolder,
} from "@/lib/storage";

import { stopSpeaking } from "@/lib/speech";

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();

  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileData>({ gender: "female", role: "student", level: "high_school" });

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);

  const [moveModalState, setMoveModalState] = useState<{isOpen: boolean, sessionId: string | null}>({ isOpen: false, sessionId: null });
  const [newFolderName, setNewFolderName] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const isHydratingRef = useRef(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    const savedProfile = localStorage.getItem("yeneta_profile");
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    } else {
      setShowProfileModal(true);
    }
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("yeneta_profile", JSON.stringify(tempProfile));
    setUserProfile(tempProfile);
    setShowProfileModal(false);
  };

  useEffect(() => {
    if (status === "authenticated") {
      const all = getAllSessions();
      setSessionsList(all);
      if (typeof getFolders === "function") setFoldersList(getFolders());

      const newSession = createNewSession(language);
      saveSession(newSession);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setSessionsList(getAllSessions());

      isHydratingRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (isHydratingRef.current) return;
    if (!currentSessionId) return;

    const existingSession = getSession(currentSessionId);

    saveSession({
      id: currentSessionId,
      messages,
      language,
      createdAt: existingSession?.createdAt || Date.now(),
      updatedAt: Date.now(),
      title: existingSession?.title || "New Chat",
      folder: existingSession?.folder,
    });

    setSessionsList(getAllSessions());
  }, [messages, currentSessionId, language]);

  if (status === "loading" || status === "unauthenticated") return null;

  const handleNewSession = (folderName?: string) => {
    stopSpeaking();
    try {
      const newSession = createNewSession(language);
      if (folderName) newSession.folder = folderName;
      saveSession(newSession);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setSessionsList(getAllSessions());
    } catch {
      const id = Date.now().toString();
      setCurrentSessionId(id);
      setMessages([]);
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLoadSession = (id: string) => {
    stopSpeaking();
    const session = getSession(id);
    if (session) {
      isHydratingRef.current = true;
      setCurrentSessionId(id);
      setMessages(session.messages);
      setLanguage(session.language || "amharic");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      setTimeout(() => { isHydratingRef.current = false; }, 0);
    }
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = getAllSessions();
    setSessionsList(updated);
    if (currentSessionId === id) handleNewSession();
  };

  const openMoveModal = (id: string) => {
    setMoveModalState({ isOpen: true, sessionId: id });
    setNewFolderName("");
  };

  const executeMove = (folderName: string) => {
    if (moveModalState.sessionId) {
      moveSessionToFolder(moveModalState.sessionId, folderName);
      setSessionsList(getAllSessions());
    }
    setMoveModalState({ isOpen: false, sessionId: null });
  };

  const executeCreateAndMove = () => {
    if (newFolderName.trim() && moveModalState.sessionId) {
      addFolder(newFolderName.trim());
      setFoldersList(getFolders());
      moveSessionToFolder(moveModalState.sessionId, newFolderName.trim());
      setSessionsList(getAllSessions());
    }
    setMoveModalState({ isOpen: false, sessionId: null });
  };

  const handleCreateFolder = (name: string) => {
    if (typeof addFolder === "function") { addFolder(name); setFoldersList(getFolders()); }
  };

  const handleDeleteFolder = (name: string) => {
    if (typeof deleteFolder === "function") { deleteFolder(name); setFoldersList(getFolders()); setSessionsList(getAllSessions()); }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); setIsTyping(false); }
  };

  const handleTranslateMessage = async (id: string, text: string) => {
    const targetLanguage = /[ሀ-፿]/.test(text) ? "english" : "amharic";
    
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: "", isStreaming: true } : m));

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) throw new Error("No stream returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        fullText += decoder.decode(value || new Uint8Array());
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: fullText } : m));
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: "Translation failed." } : m));
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, isStreaming: false } : m));
    }
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;
    const msg = messages[index];
    const sliceIndex = msg.role === "assistant" ? Math.max(0, index - 1) : index;
    const newHistory = messages.slice(0, sliceIndex);
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

    setMessages(() => [
      ...historyToUse,
      userMsg,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), type: "text", isStreaming: true } as Message,
    ]);

    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, history: historyToUse, userProfile }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) throw new Error("No stream returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        fullText += decoder.decode(value || new Uint8Array());
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Error generating response." } : m));
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
      setIsTyping(false);
    }
  };

  const handleProcessDocument = async (file: File, action: DocumentAction) => {
    setIsProcessingDoc(true);
    setShowUpload(false);
    const isImage = file.type.startsWith("image/");
    const endpoint = isImage ? "/api/upload" : "/api/document";
    
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: "Process Document", timestamp: Date.now(), type: isImage ? "image" : "document", fileName: file.name }]);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append(isImage ? "image" : "document", file);
      formData.append("language", language);
      if (!isImage) formData.append("action", action);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data: ApiResponse = await res.json();
      
      if (action === "quiz" && data.quiz) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: JSON.stringify(data.quiz), timestamp: Date.now(), type: "quiz" }]);
      } else {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.explanation || data.response || "Done.", timestamp: Date.now(), type: "text" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Failed to process the file.", timestamp: Date.now(), type: "text" }]);
    } finally {
      setIsProcessingDoc(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white relative font-noto">
      
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 text-[#1a7a4c] flex items-center justify-center rounded-full mx-auto mb-4 text-3xl">🎓</div>
            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2 text-center">Welcome to Yeneta</h2>
            <p className="text-gray-500 mb-6 text-sm text-center">Let's personalize your AI learning experience.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">I am a...</label>
                <select className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1a7a4c]" value={tempProfile.role} onChange={e => setTempProfile({...tempProfile, role: e.target.value as any})}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Education Level</label>
                <select className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1a7a4c]" value={tempProfile.level} onChange={e => setTempProfile({...tempProfile, level: e.target.value as any})}>
                  <option value="primary">Primary School</option>
                  <option value="high_school">High School</option>
                  <option value="university">University / College</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Gender (for Amharic grammar)</label>
                <select className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1a7a4c]" value={tempProfile.gender} onChange={e => setTempProfile({...tempProfile, gender: e.target.value as any})}>
                  <option value="female">Female (ሴት)</option>
                  <option value="male">Male (ወንድ)</option>
                </select>
              </div>
            </div>

            <button onClick={handleSaveProfile} className="w-full bg-[#1a7a4c] text-white py-4 rounded-xl font-bold hover:bg-[#135c39] transition-colors shadow-lg">
              Start Learning →
            </button>
          </div>
        </div>
      )}

      {moveModalState.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">Move Chat to Folder</h2>
            
            {foldersList.length > 0 ? (
              <div className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {foldersList.map(f => (
                  <button 
                    key={f} 
                    onClick={() => executeMove(f)}
                    className="w-full text-left p-3 hover:bg-green-50 rounded-xl border border-gray-200 transition-colors flex items-center gap-3"
                  >
                    <FolderIcon size={18} className="text-[#f0a500]" />
                    <span className="font-semibold text-sm text-[#1a1a2e]">{f}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6 text-center italic border border-dashed border-gray-300 rounded-xl py-6 bg-gray-50">No folders available yet.</p>
            )}

            <div className="border-t border-gray-200 pt-5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Or Create New Folder</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1a7a4c] text-sm text-[#1a1a2e]"
                />
                <button 
                  onClick={executeCreateAndMove}
                  disabled={!newFolderName.trim()}
                  className="bg-[#1a7a4c] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#135c39] disabled:opacity-50 text-sm transition-colors shadow"
                >
                  Move
                </button>
              </div>
            </div>

            <button 
              onClick={() => setMoveModalState({ isOpen: false, sessionId: null })} 
              className="w-full mt-4 p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`${isSidebarOpen ? "w-64" : "w-0 md:w-20"} transition-[width] duration-300 ease-in-out shrink-0 relative z-40 h-full bg-[#1a1a2e] shadow-2xl md:shadow-none`}>
        <Sidebar
          sessions={sessionsList}
          folders={foldersList}
          currentSessionId={currentSessionId}
          onSelect={handleLoadSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onMove={openMoveModal}
          language={language}
          isCollapsed={!isSidebarOpen}
        />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar language={language} setLanguage={setLanguage} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <ChatWindow
          messages={messages} language={language} isTyping={isTyping && !messages.some((m) => (m as any).isStreaming)}
          showUpload={showUpload} setShowUpload={setShowUpload} onProcessDocument={handleProcessDocument} isUploading={isProcessingDoc}
          onRetry={(id) => handleEditMessage(id, messages[messages.findIndex((m) => m.id === id) - 1]?.content || "")}
          onEditMessage={handleEditMessage}
          onTranslate={handleTranslateMessage}
        />
        <ChatInput onSend={handleSendMessage} onToggleUpload={() => setShowUpload(!showUpload)} language={language} isLoading={isTyping || isProcessingDoc} onStopGeneration={stopGeneration} />
      </div>
    </div>
  );
}