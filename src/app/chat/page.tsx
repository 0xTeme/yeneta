"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import DocumentUpload from "@/components/DocumentUpload";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, UserProfileData } from "@/types";
import { Folder as FolderIcon, Loader2, X, ChevronDown, CheckCircle2, LogOut, Trash2 } from "lucide-react";
import { stopSpeaking } from "@/lib/speech";
import {
  getDbProfile, saveDbProfile,
  getDbFolders, createDbFolder, deleteDbFolder,
  getDbSessions, saveDbSession, deleteDbSession, moveDbSession
} from "@/lib/actions";

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export default function ChatPage() {
  const { status, data: sessionData } = useSession();
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);

  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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

    // CRITICAL FIX: Prevent database save spam during active stream.
    // The effect will trigger one final time when isStreaming flips to false.
    const isCurrentlyStreaming = messages.some((m) => m.isStreaming);
    if (isCurrentlyStreaming) return;

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
    
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (errorText === "Translation failed") {
          throw new Error("Translation failed - Gemini API error");
        }
        throw new Error(`Server error: ${res.status}`);
      }

      if (!res.body) throw new Error("No stream returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 100;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        fullText += decoder.decode(value || new Uint8Array());
        
        const now = Date.now();
        if (now - lastUpdate >= UPDATE_INTERVAL || done) {
          lastUpdate = now;
          setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: fullText } : m));
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Translation error:", error);
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: "Translation failed. Please try again." } : m));
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
    const localHistory = customHistory || messages;

    if (stagedFile) {
      await handleProcessDocument(stagedFile, "explain");
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now(), type: "text" };
    const assistantId = (Date.now() + 1).toString();

    setMessages(() => [
      ...localHistory,
      userMsg,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), type: "text", isStreaming: true } as Message,
    ]);

    setIsTyping(true);
    abortControllerRef.current = new AbortController();

    let apiHistory = [...localHistory];
    const currentMeta = sessionsList.find((s) => s.id === currentSessionId);
    
    if (currentMeta?.folder) {
      const otherSessions = sessionsList.filter((s) => s.folder === currentMeta.folder && s.id !== currentSessionId);
      const otherMessages = otherSessions.flatMap((s) => s.messages || []);
      const combinedHistory = [...otherMessages, ...localHistory].sort((a, b) => a.timestamp - b.timestamp);
      apiHistory = combinedHistory.slice(-40);
    }

    const cleanHistory: Message[] = [];
    let expectedRole = "user";

    for (const msg of apiHistory) {
      if (msg.role === expectedRole && msg.content?.trim()) {
        cleanHistory.push(msg);
        expectedRole = expectedRole === "user" ? "assistant" : "user";
      }
    }

    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === "user") {
      cleanHistory.pop();
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, history: cleanHistory, userProfile }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.body) throw new Error("No stream returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 100;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        fullText += decoder.decode(value || new Uint8Array());
        
        const now = Date.now();
        if (now - lastUpdate >= UPDATE_INTERVAL || done) {
          lastUpdate = now;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
        }
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

  const handleProcessDocument = async (file: File, action: DocumentAction, questionCount?: number) => {
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
      if (!isImage && action === "quiz" && questionCount) formData.append("questionCount", questionCount.toString());

      const res = await fetch(endpoint, { method: "POST", body: formData });
      
      // CRITICAL FIX: Safe JSON parsing fallback for Vercel 413 Payload Too Large
      if (!res.ok) {
        throw new Error("Server rejected the file. It may be too large or invalid.");
      }

      const data: ApiResponse = await res.json();
      
      if (action === "quiz" && data.quiz) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: JSON.stringify(data.quiz), timestamp: Date.now(), type: "quiz" }]);
      } else {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.explanation || data.response || "Done.", timestamp: Date.now(), type: "text" }]);
      }

    } catch (error: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: error.message || "Failed to process the file.", timestamp: Date.now(), type: "text" }]);
    } finally {
      setIsProcessingDoc(false);
      setIsTyping(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") return null;

  if (isInitializing) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background flex-col gap-5">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-content tracking-tight font-headline">Yeneta</h2>
          <p className="text-xs text-content-muted mt-2 font-label tracking-widest uppercase">Loading your study room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background font-body text-content">
      
      {(showProfileModal || moveModalState.isOpen) && (
        <div className="fixed inset-0 z-[35] bg-background/70 backdrop-blur-md animate-in fade-in duration-200" />
      )}
      
      <Navbar language={language} setLanguage={setLanguage} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      
      {/* USER PROFILE MODAL / SETTINGS DRAWER */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => userProfile && setShowProfileModal(false)}></div>
          
          <aside className="relative z-50 w-full max-w-[400px] h-full bg-surface-glass backdrop-blur-xl shadow-sm border-l border-border-subtle flex flex-col animate-in slide-in-from-right duration-300">
            <header className="flex items-center justify-between px-8 py-8 shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-content font-headline">
                {userProfile ? "Settings" : "Welcome"}
              </h1>
              {userProfile && (
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-surface-hover rounded-full transition-all duration-200 group border border-transparent hover:border-border-subtle">
                  <X className="text-content-muted group-hover:text-content" size={20} />
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-8 space-y-8 custom-scrollbar pb-12">
              {!userProfile && (
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-16 h-16 bg-primary-muted rounded-full flex items-center justify-center mb-4 border border-primary/30">
                    <span className="text-2xl">🎓</span>    
                  </div>
                  <p className="text-content-muted text-sm leading-relaxed">Let's personalize your Yeneta learning experience.</p>
                </div>
              )}

              <section className="space-y-5">
                <h3 className="text-[0.6875rem] font-bold tracking-widest text-content-muted uppercase font-label">Preferences</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">I am a...</label>
                    <div className="relative">
                      <select className="appearance-none bg-background border border-border-strong rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full cursor-pointer outline-none transition-shadow" value={tempProfile.role} onChange={e => setTempProfile({...tempProfile, role: e.target.value as any})}>
                        <option value="student" className="bg-surface text-content">Student</option>
                        <option value="teacher" className="bg-surface text-content">Teacher</option>
                        <option value="other" className="bg-surface text-content">Other</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                    {tempProfile.role === "other" && (
                      <input type="text" placeholder="Please specify..." value={customRole} onChange={(e) => setCustomRole(e.target.value)} className="w-full mt-2 bg-background border border-border-strong rounded-lg py-3 px-4 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary outline-none animate-in slide-in-from-top-1" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">Education Level</label>
                    <div className="relative">
                      <select className="appearance-none bg-background border border-border-strong rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full cursor-pointer outline-none transition-shadow" value={tempProfile.level} onChange={e => setTempProfile({...tempProfile, level: e.target.value as any})}>
                        <option value="primary" className="bg-surface text-content">Primary School</option>
                        <option value="high_school" className="bg-surface text-content">High School</option>
                        <option value="university" className="bg-surface text-content">University / College</option>
                        <option value="other" className="bg-surface text-content">Other</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                    {tempProfile.level === "other" && (
                      <input type="text" placeholder="Please specify..." value={customLevel} onChange={(e) => setCustomLevel(e.target.value)} className="w-full mt-2 bg-background border border-border-strong rounded-lg py-3 px-4 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary outline-none animate-in slide-in-from-top-1" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">Gender <span className="text-content-muted font-normal">(Amharic grammar)</span></label>
                    <div className="relative">
                      <select className="appearance-none bg-background border border-border-strong rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full cursor-pointer outline-none transition-shadow" value={tempProfile.gender} onChange={e => setTempProfile({...tempProfile, gender: e.target.value as any})}>
                        <option value="female" className="bg-surface text-content">Female (ሴት)</option>
                        <option value="male" className="bg-surface text-content">Male (ወንድ)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">AI Reader Voice</label>
                    <div className="relative">
                      <select className="appearance-none bg-background border border-border-strong rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full cursor-pointer outline-none transition-shadow" value={tempProfile.aiVoice || "female"} onChange={e => setTempProfile({...tempProfile, aiVoice: e.target.value as any})}>
                        <option value="female" className="bg-surface text-content">Female Voice</option>
                        <option value="male" className="bg-surface text-content">Male Voice</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                  </div>

                </div>
              </section>

            </div>

            <footer className="p-8 mt-auto border-t border-border-subtle shrink-0">
              <button onClick={handleSaveProfile} className="w-full py-4 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                {userProfile ? "Save Changes" : "Start Learning"}
                <CheckCircle2 size={18} />
              </button>
            </footer>
          </aside>
        </div>
      )}

      {/* MOVE TO FOLDER MODAL */}
      {moveModalState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in" onClick={() => setMoveModalState({ isOpen: false, sessionId: null })}></div>
          
          <div className="relative bg-surface-glass backdrop-blur-xl rounded-2xl p-8 max-w-[420px] w-full shadow-sm border border-border-subtle animate-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-content mb-6 tracking-tight font-headline text-center">Move Chat to Folder</h2>
            
            {foldersList.length > 0 ? (
              <div className="space-y-2 mb-8 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {foldersList.map(f => (
                  <button 
                    key={f} 
                    onClick={() => executeMove(f)}
                    className="w-full text-left p-4 hover:bg-surface-hover rounded-xl border border-border-subtle transition-colors flex items-center gap-3 group"
                  >
                    <FolderIcon size={18} className="text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm text-content">{f}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-content-muted mb-8 text-center italic border border-dashed border-border-strong rounded-xl py-6 bg-surface-hover">No folders available yet.</p>
            )}

            <div className="border-t border-border-subtle pt-6">
              <label className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-widest mb-3 block font-label">Or Create New Folder</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeCreateAndMove()}
                  placeholder="New folder name..."
                  className="flex-1 p-3 bg-background border border-border-strong rounded-xl outline-none focus:border-primary text-sm text-content font-body placeholder-content-muted"
                />
                <button 
                  onClick={executeCreateAndMove}
                  disabled={!newFolderName.trim()}
                  className="bg-primary text-content-inverse px-5 py-3 rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 text-sm transition-all shadow-sm font-headline"
                >
                  Move
                </button>
              </div>
            </div>

            <button 
              onClick={() => setMoveModalState({ isOpen: false, sessionId: null })} 
              className="w-full mt-6 py-4 bg-surface text-content hover:bg-surface-hover rounded-xl border border-border-strong text-sm font-bold transition-colors font-headline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        
        <div className={`
          ${isSidebarOpen 
            ? "w-[288px] translate-x-0 md:w-64 md:translate-x-0" 
            : "w-0 -translate-x-full md:w-20 md:translate-x-0 invisible md:visible"
          }
          fixed md:fixed inset-y-0 left-0 right-0 md:right-auto z-40
          top-[66px] md:top-[66px]
          transition-all duration-300 ease-out 
          shrink-0
          overflow-visible
        `}>
          <div className={`w-full md:${isSidebarOpen ? "w-full" : "w-20"} h-full p-3`}>
            <div className={`h-full bg-surface/95 backdrop-blur-xl shadow-xl border border-border-subtle/50 overflow-hidden rounded-2xl`}>
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
          </div>
        </div>

        {isSidebarOpen && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-20 md:hidden animate-in fade-in duration-200 pointer-events-none" />
        )}

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-transparent relative">
          <ChatWindow 
            messages={messages} language={language} aiVoice={userProfile?.aiVoice || "female"} isTyping={isTyping && !messages.some((m) => (m as any).isStreaming)}
            showUpload={showUpload} setShowUpload={setShowUpload} onProcessDocument={handleProcessDocument} isUploading={isProcessingDoc}
            onRetry={(id) => handleEditMessage(id, messages[messages.findIndex((m) => m.id === id) - 1]?.content || "")}
            onEditMessage={handleEditMessage}
            onTranslate={handleTranslateMessage}
          />
          
          <div className={`relative w-full px-3 md:px-3 z-10`}>
            <div className={`${isSidebarOpen ? "bg-background/40 backdrop-blur-sm" : ""}`}>
              {showUpload && (
                <div className="absolute bottom-full mb-0 w-full flex justify-center px-4 left-0 right-0 z-30 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
                  <div className="pointer-events-auto w-full max-w-[500px]">
                    <DocumentUpload language={language} onClose={() => setShowUpload(false)} onProcess={handleProcessDocument} isProcessing={isProcessingDoc} />
                  </div>
                </div>
              )}
              <ChatInput onSend={handleSendMessage} onToggleUpload={() => setShowUpload(!showUpload)} language={language} isLoading={isTyping || isProcessingDoc} onStopGeneration={stopGeneration} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
