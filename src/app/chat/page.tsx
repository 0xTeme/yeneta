"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, UserProfileData } from "@/types";
import { Folder as FolderIcon, Loader2 } from "lucide-react";
import { stopSpeaking } from "@/lib/speech";
import {
  getDbProfile, saveDbProfile,
  getDbFolders, createDbFolder, deleteDbFolder,
  getDbSessions, saveDbSession, deleteDbSession, moveDbSession
} from "@/lib/actions";

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);

  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileData>({ gender: "female", aiVoice: "female", role: "student", level: "high_school" });
  const [customRole, setCustomRole] = useState("");
  const [customLevel, setCustomLevel] = useState("");

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);

  const [moveModalState, setMoveModalState] = useState<{isOpen: boolean, sessionId: string | null}>({ isOpen: false, sessionId: null });
  const [newFolderName, setNewFolderName] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const isHydratingRef = useRef(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (moveModalState.isOpen) setMoveModalState({ isOpen: false, sessionId: null });
        if (showProfileModal && userProfile) setShowProfileModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveModalState.isOpen, showProfileModal, userProfile]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      const loadCloudData = async () => {
        try {
          const profile = await getDbProfile();
          if (profile) {
            setUserProfile(profile as any);
          } else {
            setShowProfileModal(true);
          }

          const [folders, sessions] = await Promise.all([getDbFolders(), getDbSessions()]);
          setFoldersList(folders);
          setSessionsList(sessions);

          if (sessions.length > 0) {
            const latest = sessions[0];
            setCurrentSessionId(latest.id);
            setMessages(latest.messages || []);
            setLanguage((latest.language as Language) || "amharic");
          } else {
            const newId = generateId();
            setCurrentSessionId(newId);
          }
        } catch (error) {
          console.error("Failed to load cloud data:", error);
        } finally {
          setIsInitializing(false);
          isHydratingRef.current = false;
        }
      };
      
      loadCloudData();
    }
  }, [status]);

  useEffect(() => {
    if (isHydratingRef.current || isInitializing) return;
    if (!currentSessionId) return;

    const currentMeta = sessionsList.find(s => s.id === currentSessionId);
    const firstUserMsg = messages.find(m => m.role === "user");
    let title = "New Chat";
    
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 50);
      if (title.length < firstUserMsg.content.length) title += "...";
    }

    const sessionData = {
      id: currentSessionId,
      title,
      language,
      messages,
      folder: currentMeta?.folder
    };

    setSessionsList(prev => {
      const index = prev.findIndex(s => s.id === currentSessionId);
      if (index >= 0) {
        const newList = [...prev];
        newList[index] = { ...newList[index], title, language, messages, updatedAt: Date.now() };
        return newList.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [{ ...sessionData, updatedAt: Date.now() }, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
    });

    saveDbSession(sessionData).catch(console.error);

  }, [messages, currentSessionId, language]);

  const handleSaveProfile = async () => {
    const finalProfile = {
      gender: tempProfile.gender,
      aiVoice: tempProfile.aiVoice || "female",
      role: tempProfile.role === "other" ? (customRole.trim() || "Rather not say") : tempProfile.role,
      level: tempProfile.level === "other" ? (customLevel.trim() || "Rather not say") : tempProfile.level,
    };
    
    setUserProfile(finalProfile as any);
    setShowProfileModal(false);
    await saveDbProfile(finalProfile);
  };

  const handleNewSession = (folderName?: string) => {
    stopSpeaking();
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([]);
    
    const newSession = { id: newId, title: "New Chat", language, folder: folderName, messages: [], updatedAt: Date.now() };
    setSessionsList(prev => [newSession, ...prev]);
    saveDbSession(newSession).catch(console.error);

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLoadSession = (id: string) => {
    stopSpeaking();
    const session = sessionsList.find(s => s.id === id);
    if (session) {
      isHydratingRef.current = true;
      setCurrentSessionId(id);
      setMessages(session.messages || []);
      setLanguage(session.language || "amharic");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      setTimeout(() => { isHydratingRef.current = false; }, 0);
    }
  };

  const handleDeleteSession = async (id: string) => {
    const updated = sessionsList.filter(s => s.id !== id);
    setSessionsList(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) handleLoadSession(updated[0].id);
      else handleNewSession();
    }
    await deleteDbSession(id);
  };

  const executeMove = async (folderName: string) => {
    const id = moveModalState.sessionId;
    if (id) {
      setSessionsList(prev => prev.map(s => s.id === id ? { ...s, folder: folderName } : s));
      setMoveModalState({ isOpen: false, sessionId: null });
      await moveDbSession(id, folderName);
    }
  };

  const executeCreateAndMove = async () => {
    const name = newFolderName.trim();
    const id = moveModalState.sessionId;
    if (name && id) {
      setFoldersList(prev => [...new Set([...prev, name])].sort());
      setSessionsList(prev => prev.map(s => s.id === id ? { ...s, folder: name } : s));
      setMoveModalState({ isOpen: false, sessionId: null });
      
      await createDbFolder(name);
      await moveDbSession(id, name);
    }
  };

  const handleCreateFolder = async (name: string) => {
    setFoldersList(prev => [...new Set([...prev, name])].sort());
    await createDbFolder(name);
  };

  const handleDeleteFolder = async (name: string) => {
    setFoldersList(prev => prev.filter(f => f !== name));
    setSessionsList(prev => prev.map(s => s.folder === name ? { ...s, folder: undefined } : s));
    await deleteDbFolder(name);
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

  if (status === "loading" || status === "unauthenticated") return null;

  // --- NEW: CLOUD LOADING SCREEN ---
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0f172a] flex-col gap-4">
        <Loader2 className="w-12 h-12 text-[#1a7a4c] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a1a2e] dark:text-white">የኔታ</h2>
        <p className="text-sm text-gray-500">Loading your study room...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0f172a] relative font-noto">
      
      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-[#1a7a4c] dark:text-green-400 flex items-center justify-center rounded-full mx-auto mb-4 text-3xl">🎓</div>
            <h2 className="text-2xl font-bold text-[#1a1a2e] dark:text-white mb-2 text-center">Welcome to Yeneta</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm text-center">Let's personalize your AI learning experience.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">I am a...</label>
                <select className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-[#1a1a2e] dark:text-white" value={tempProfile.role} onChange={e => setTempProfile({...tempProfile, role: e.target.value as any})}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="other">Other</option>
                </select>
                {tempProfile.role === "other" && (
                  <input type="text" placeholder="Rather not say" value={customRole} onChange={(e) => setCustomRole(e.target.value)} className="w-full mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-sm text-[#1a1a2e] dark:text-white animate-in slide-in-from-top-1" />
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Education Level</label>
                <select className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-[#1a1a2e] dark:text-white" value={tempProfile.level} onChange={e => setTempProfile({...tempProfile, level: e.target.value as any})}>
                  <option value="primary">Primary School</option>
                  <option value="high_school">High School</option>
                  <option value="university">University / College</option>
                  <option value="other">Other</option>
                </select>
                {tempProfile.level === "other" && (
                  <input type="text" placeholder="Rather not say" value={customLevel} onChange={(e) => setCustomLevel(e.target.value)} className="w-full mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-sm text-[#1a1a2e] dark:text-white animate-in slide-in-from-top-1" />
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gender (for Amharic grammar)</label>
                <select className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-[#1a1a2e] dark:text-white" value={tempProfile.gender} onChange={e => setTempProfile({...tempProfile, gender: e.target.value as any})}>
                  <option value="female">Female (ሴት)</option>
                  <option value="male">Male (ወንድ)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">AI Reader Voice</label>
                <select className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-[#1a1a2e] dark:text-white" value={tempProfile.aiVoice || "female"} onChange={e => setTempProfile({...tempProfile, aiVoice: e.target.value as any})}>
                  <option value="female">Female Voice</option>
                  <option value="male">Male Voice</option>
                </select>
              </div>
            </div>

            <button onClick={handleSaveProfile} className="w-full bg-[#1a7a4c] text-white py-4 rounded-xl font-bold hover:bg-[#135c39] transition-colors shadow-lg">
              Start Learning →
            </button>
          </div>
        </div>
      )}

      {/* MOVE TO FOLDER MODAL */}
      {moveModalState.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in">
            <h2 className="text-xl font-bold text-[#1a1a2e] dark:text-white mb-4">Move Chat to Folder</h2>
            
            {foldersList.length > 0 ? (
              <div className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {foldersList.map(f => (
                  <button 
                    key={f} 
                    onClick={() => executeMove(f)}
                    className="w-full text-left p-3 hover:bg-green-50 dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-3"
                  >
                    <FolderIcon size={18} className="text-[#f0a500]" />
                    <span className="font-semibold text-sm text-[#1a1a2e] dark:text-gray-200">{f}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center italic border border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-6 bg-gray-50 dark:bg-gray-800/50">No folders available yet.</p>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block">Or Create New Folder</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeCreateAndMove()}
                  placeholder="New folder name..."
                  className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-[#1a7a4c] text-sm text-[#1a1a2e] dark:text-white"
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
              className="w-full mt-4 p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SMART SIDEBAR */}
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
          onMove={(id) => {
            setMoveModalState({ isOpen: true, sessionId: id });
            setNewFolderName("");
          }}
          language={language}
          isCollapsed={!isSidebarOpen}
          onOpenSettings={() => {
            if (userProfile) {
              setTempProfile({
                gender: userProfile.gender as any,
                aiVoice: userProfile.aiVoice as any,
                role: ["student", "teacher"].includes(userProfile.role) ? userProfile.role : "other",
                level: ["primary", "high_school", "university"].includes(userProfile.level) ? userProfile.level : "other",
              });
            }
            setShowProfileModal(true);
          }}
        />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-white dark:bg-[#0f172a]">
        <Navbar language={language} setLanguage={setLanguage} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <ChatWindow
          messages={messages} language={language} aiVoice={userProfile?.aiVoice || "female"} isTyping={isTyping && !messages.some((m) => (m as any).isStreaming)}
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