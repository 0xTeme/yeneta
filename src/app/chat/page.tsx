"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import DocumentUpload from "@/components/DocumentUpload";
import Sidebar from "@/components/Sidebar";
import { Message, Language, DocumentAction, ApiResponse, UserProfileData } from "@/types";
import { Loader2, X, ChevronDown, CheckCircle2, Folder as FolderIcon } from "lucide-react";
import { stopSpeaking } from "@/lib/speech";
import {
  getDbProfile, saveDbProfile,
  getDbFolders, createDbFolder, deleteDbFolder,
  getDbSessions, saveDbSession, deleteDbSession, moveDbSession
} from "@/lib/actions";

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

interface TempProfileData {
  role: string; iam_custom: string;
  level: string; education_custom: string;
  gender: string; 
  aiVoice: "male" | "female";
}

export default function ChatPage() {
  const { status } = useSession();

  const [isInitializing, setIsInitializing] = useState(true);
  const [language, setLanguage] = useState<Language>("amharic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [tempProfile, setTempProfile] = useState<TempProfileData>({ 
    role: "student", iam_custom: "", 
    level: "high_school", education_custom: "", 
    gender: "female",
    aiVoice: "female" 
  });
  const [settingsErrors, setSettingsErrors] = useState({ role: false, level: false });

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [foldersList, setFoldersList] = useState<string[]>([]);
  const [moveModalState, setMoveModalState] = useState<{isOpen: boolean, sessionId: string | null}>({ isOpen: false, sessionId: null });
  const [newFolderName, setNewFolderName] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const isHydratingRef = useRef(true);

  useEffect(() => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const loadCloudData = async () => {
        try {
          const profile = await getDbProfile();
          if (profile) setUserProfile(profile as any);

          const [folders, sessions] = await Promise.all([getDbFolders(), getDbSessions()]);
          setFoldersList(folders);
          setSessionsList(sessions);

          if (sessions.length > 0) {
            const latest = sessions[0];
            setCurrentSessionId(latest.id);
            setMessages(latest.messages || []);
            setLanguage((latest.language as Language) || "amharic");
          } else {
            setCurrentSessionId(generateId());
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
    if (isHydratingRef.current || isInitializing || !currentSessionId) return;
    if (messages.some((m) => m.isStreaming)) return;

    const currentMeta = sessionsList.find(s => s.id === currentSessionId);
    const firstUserMsg = messages.find(m => m.role === "user");
    let title = "New Chat";
    
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 50);
      if (title.length < firstUserMsg.content.length) title += "...";
    }

    const sessionData = { id: currentSessionId, title, language, messages, folder: currentMeta?.folder };

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
    const errors = {
      role: tempProfile.role === "other" && !tempProfile.iam_custom.trim(),
      level: tempProfile.level === "other" && !tempProfile.education_custom.trim(),
    };

    if (errors.role || errors.level) {
      setSettingsErrors(errors);
      return;
    }

    const finalProfile = {
      role: tempProfile.role === "other" ? tempProfile.iam_custom.trim() : tempProfile.role,
      level: tempProfile.level === "other" ? tempProfile.education_custom.trim() : tempProfile.level,
      gender: tempProfile.gender, 
      aiVoice: tempProfile.aiVoice,
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
  };

  const handleLoadSession = (id: string) => {
    stopSpeaking();
    const session = sessionsList.find(s => s.id === id);
    if (session) {
      isHydratingRef.current = true;
      setCurrentSessionId(id);
      setMessages(session.messages || []);
      setLanguage(session.language || "amharic");
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

  const handleCreateFolder = async (name: string) => {
    setFoldersList(prev => [...new Set([...prev, name])].sort());
    await createDbFolder(name);
  };

  const handleDeleteFolder = async (name: string) => {
    setFoldersList(prev => prev.filter(f => f !== name));
    setSessionsList(prev => prev.map(s => s.folder === name ? { ...s, folder: undefined } : s));
    await deleteDbFolder(name);
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

  const stopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); setIsTyping(false); }
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
      await handleProcessDocument(stagedFile, "custom", undefined, text || "Analyze this document");
      return;
    }

    // Check if user wants an image
    const imageKeywords = /draw|paint|create.image|generate.image|show.me.a|show.me.an|image of|picture of|illustrate|visualize|show me/i;
    const wantsImage = imageKeywords.test(text);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now(), type: "text" };
    const assistantId = (Date.now() + 1).toString();



    setMessages(() => [...localHistory, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), type: "text", isStreaming: true } as Message]);
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
    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === "user") cleanHistory.pop();

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
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        fullText += decoder.decode(value || new Uint8Array(), { stream: !doneReading });
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
      }

      const imageUrls: string[] = [];
      const addImageUrl = (url: string) => { 
        if (url && url.length > 10 && !imageUrls.includes(url)) {
          imageUrls.push(url); 
        }
      };

      let isJsonResponse = false;
      let parsedJson: { english?: string; amharic?: string } | null = null;
      
      let textContent = fullText;
      try {
        const cleanedForJson = fullText.replace(/^```json\n?/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleanedForJson);
        if (parsed && (parsed.english || parsed.amharic)) {
          parsedJson = parsed;
          isJsonResponse = true;
          textContent = parsed.english || parsed.amharic || fullText;
        }
      } catch {
        textContent = fullText;
      }
      
      let match;
      const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      while ((match = mdImageRegex.exec(textContent)) !== null) {
        addImageUrl(match[2]);
      }

      const allUrlsRegex = /https:\/\/[^\s<>"')\]]+/gi;
      while ((match = allUrlsRegex.exec(textContent)) !== null) {
        const url = match[0];
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.match(/\.(?:jpg|jpeg|png|gif|webp|svg)(\?|$)/) ||
            lowerUrl.includes("unsplash.com") ||
            lowerUrl.includes("picsum.photos") ||
            lowerUrl.includes("imgur.com") ||
            lowerUrl.includes("pexels.com") ||
            lowerUrl.includes("pixabay.com") ||
            lowerUrl.includes("flickr.com") ||
            lowerUrl.includes("cloudinary.com") ||
            lowerUrl.includes("images.google") ||
            lowerUrl.includes("image")) {
          addImageUrl(url);
        }
      }

      // Check for image search markers
      const imageMarkerRegex = /\[\[IMAGE:\s*([^\]]+)\]\]/gi;
      const imageMarkers: string[] = [];
      let markerMatch;
      while ((markerMatch = imageMarkerRegex.exec(textContent)) !== null) {
        imageMarkers.push(markerMatch[1].trim());
      }

      if (imageMarkers.length > 0) {
        // Search for images using the queries from the AI
        try {
          const searchRes = await fetch("/api/image-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: imageMarkers[0] }),
          });
          const searchData = await searchRes.json();
          
          if (searchData.images && searchData.images.length > 0) {
            // Clean content by removing the IMAGE markers
            let cleanContent = textContent
              .replace(/\[\[IMAGE:\s*[^\]]+\]\]/gi, "")
              .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
              .replace(/https:\/\/[^\s<>"')\]]+/gi, "")
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\n{3,}/g, "\n\n")
              .trim();
            
            let finalContent = fullText;
            if (isJsonResponse && parsedJson) {
              parsedJson.english = (parsedJson.english || "").replace(/\[\[IMAGE:\s*[^\]]+\]\]/gi, "").replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/https:\/\/[^\s<>"')\]]+/gi, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
              parsedJson.amharic = (parsedJson.amharic || "").replace(/\[\[IMAGE:\s*[^\]]+\]\]/gi, "").replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/https:\/\/[^\s<>"')\]]+/gi, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
              finalContent = JSON.stringify(parsedJson);
            } else {
              finalContent = cleanContent || "Here are some images:";
            }
            
            setMessages((prev) => prev.map((m) => 
              m.id === assistantId 
                ? { ...m, content: finalContent, imageUrls: searchData.images }
                : m
            ));
            return;
          }
        } catch (e) {
          console.error("Image search failed:", e);
        }
      }

      // Fallback: check for existing markdown images or URLs
      const allImageUrls: string[] = [];
      const addUrl = (url: string) => { if (url && url.length > 10 && !allImageUrls.includes(url)) allImageUrls.push(url); };
      
      const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      while ((match = mdRegex.exec(textContent)) !== null) addUrl(match[2]);

      const urlRegex = /https:\/\/[^\s<>"')\]]+/gi;
      while ((match = urlRegex.exec(textContent)) !== null) {
        const url = match[0];
        if (url.match(/\.(?:jpg|jpeg|png|gif|webp)(\?|$)/i) || url.includes("wikimedia") || url.includes("unsplash")) {
          addUrl(url);
        }
      }

      if (allImageUrls.length > 0) {
        let cleanContent = textContent
          .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
          .replace(/https:\/\/[^\s<>"')\]]+/gi, "")
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        
        let finalContent = fullText;
        if (isJsonResponse && parsedJson) {
          parsedJson.english = (parsedJson.english || "").replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/https:\/\/[^\s<>"')\]]+/gi, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
          parsedJson.amharic = (parsedJson.amharic || "").replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/https:\/\/[^\s<>"')\]]+/gi, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
          finalContent = JSON.stringify(parsedJson);
        } else {
          finalContent = cleanContent;
        }
        
        setMessages((prev) => prev.map((m) => 
          m.id === assistantId 
            ? { ...m, content: finalContent, imageUrls: allImageUrls }
            : m
        ));
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const isLimitExceeded = error.message?.includes("429") || 
                               error.message?.includes("limit_exceeded") ||
                               error.message?.toLowerCase().includes("quota");
        
        if (isLimitExceeded) {
          setMessages((prev) => prev.map((m) => m.id === assistantId 
            ? { ...m, content: language === "amharic" 
                ? '{"english":"Your API limit has been reached. Please try again later.","amharic":"የእርስዎ API ገደብ ደርሷል። እባክዎ ቆየት ብለው እንደገና ይሞክሩ።"}' 
                : '{"english":"Your API limit has been reached. Please try again later.","amharic":"የእርስዎ API ገደብ ደርሷል። እባክዎ ቆየት ብለው እንደገና ይሞክሩ።"}'
              } : m
          ));
        } else {
          setMessages((prev) => prev.map((m) => m.id === assistantId 
            ? { ...m, content: language === "amharic" 
                ? '{"english":"Error generating response.","amharic":"ስህተት ተከስቷል።"}' 
                : '{"english":"Error generating response.","amharic":"ስህተት ተከስቷል።"}'
              } : m
          ));
        }
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
      setIsTyping(false);
    }
  };

  const handleProcessDocument = async (file: File | null, action: DocumentAction, questionCount?: number, instruction?: string) => {
    setIsProcessingDoc(true);
    setShowUpload(false);

    let displayAction = instruction || "Process Document";
    if (!instruction && action === "summarize") displayAction = "Summarize Document";
    if (!instruction && action === "quiz") displayAction = `Generate ${questionCount} Question Quiz`;

    const docName = file ? file.name : "Saved Document Memory";
    const msgType = action === "quiz" ? "quiz" : "document";

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: displayAction, timestamp: Date.now(), type: msgType, fileName: docName }]);
    setIsTyping(true);

    try {
      const formData = new FormData();
      if (file) formData.append("document", file);
      formData.append("language", language);
      formData.append("action", action);
      if (instruction) formData.append("instruction", instruction);
      if (questionCount) formData.append("questionCount", questionCount.toString());

      const res = await fetch("/api/document", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Document analysis failed.");
      
      const data: ApiResponse = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.response || "{}", timestamp: Date.now(), type: msgType }]);

    } catch (error: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `{"english":"${error.message}","amharic":"ስህተት ተከስቷል"}` , timestamp: Date.now(), type: "text" }]);
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
    <div className="flex flex-col h-[100dvh] overflow-hidden overscroll-none bg-background font-body text-content">
      {(showProfileModal || moveModalState.isOpen) && <div className="fixed inset-0 z-[35] bg-background/70 backdrop-blur-md animate-in fade-in duration-200" />}
      
      <Navbar 
        language={language} 
        setLanguage={setLanguage} 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        isSidebarOpen={isSidebarOpen} 
      />
      
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:justify-end lg:p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProfileModal(false)}></div>
          
          <aside className="relative z-50 w-full max-w-lg lg:max-w-[420px] max-h-[90vh] lg:max-h-full lg:h-full flex flex-col bg-surface/95 backdrop-blur-md shadow-2xl border border-border-subtle/50 rounded-3xl lg:rounded-2xl overflow-hidden animate-in zoom-in-95 lg:slide-in-from-right duration-300">
            <header className="flex items-center justify-between px-6 py-6 lg:px-8 lg:py-8 shrink-0 border-b border-border-subtle/50">
              <h1 className="text-2xl font-bold tracking-tight text-content font-headline"> Settings</h1>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-surface-hover rounded-full transition-all duration-200 border border-transparent hover:border-border-subtle">
                <X className="text-content-muted" size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 custom-scrollbar">
              <section className="space-y-6">
                <h3 className="text-[0.6875rem] font-bold tracking-widest text-content-muted uppercase font-label">Preferences</h3>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">I am a...</label>
                    <div className="relative">
                      <select className={`appearance-none bg-background border ${settingsErrors.role ? 'border-error-base' : 'border-border-strong'} rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full outline-none transition-colors`} value={tempProfile.role} onChange={e => { setTempProfile({...tempProfile, role: e.target.value as any}); setSettingsErrors({...settingsErrors, role: false}); }}>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="professional">Professional</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                    {tempProfile.role === "other" && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                        <input type="text" placeholder="Please specify your role" value={tempProfile.iam_custom} onChange={e => { setTempProfile({...tempProfile, iam_custom: e.target.value}); setSettingsErrors({...settingsErrors, role: false}); }} className={`w-full bg-background border ${settingsErrors.role ? 'border-error-base' : 'border-border-strong focus:border-primary'} rounded-lg py-3 px-4 text-sm text-content outline-none focus:ring-1 focus:ring-primary/40 transition-shadow`} />
                        {settingsErrors.role && <p className="text-error-base text-[10px] mt-1 font-bold">Please specify a value</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">Education Level</label>
                    <div className="relative">
                      <select className={`appearance-none bg-background border ${settingsErrors.level ? 'border-error-base' : 'border-border-strong'} rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full outline-none transition-colors`} value={tempProfile.level} onChange={e => { setTempProfile({...tempProfile, level: e.target.value as any}); setSettingsErrors({...settingsErrors, level: false}); }}>
                        <option value="primary">Primary School</option>
                        <option value="high_school">High School</option>
                        <option value="university">University / College</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                    {tempProfile.level === "other" && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                        <input type="text" placeholder="Please specify your education level" value={tempProfile.education_custom} onChange={e => { setTempProfile({...tempProfile, education_custom: e.target.value}); setSettingsErrors({...settingsErrors, level: false}); }} className={`w-full bg-background border ${settingsErrors.level ? 'border-error-base' : 'border-border-strong focus:border-primary'} rounded-lg py-3 px-4 text-sm text-content outline-none focus:ring-1 focus:ring-primary/40 transition-shadow`} />
                        {settingsErrors.level && <p className="text-error-base text-[10px] mt-1 font-bold">Please specify a value</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-content">Gender <span className="text-content-muted font-normal">(Amharic grammar)</span></label>
                    <div className="relative">
                      <select className="appearance-none bg-background border border-border-strong rounded-lg py-3 pl-4 pr-10 text-[0.875rem] font-label text-content focus:ring-1 focus:ring-primary/40 focus:border-primary w-full outline-none transition-colors" value={tempProfile.gender} onChange={e => { setTempProfile({...tempProfile, gender: e.target.value as any}); }}>
                        <option value="female">Female (ሴት)</option>
                        <option value="male">Male (ወንድ)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-content">AI Reader Voice</label>
                    <div className="flex bg-background border border-border-strong rounded-xl p-1 shadow-sm">
                      <button type="button" onClick={() => setTempProfile({ ...tempProfile, aiVoice: "female" })} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tempProfile.aiVoice === "female" ? "bg-surface shadow-sm text-content" : "text-content-muted hover:text-content"}`}>
                        Female
                      </button>
                      <button type="button" onClick={() => setTempProfile({ ...tempProfile, aiVoice: "male" })} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tempProfile.aiVoice === "male" ? "bg-surface shadow-sm text-content" : "text-content-muted hover:text-content"}`}>
                        Male
                      </button>
                    </div>
                  </div>

                </div>
              </section>
            </div>

            <footer className="p-6 lg:p-8 mt-auto border-t border-border-subtle shrink-0 bg-surface/95 backdrop-blur-md">
              <button onClick={handleSaveProfile} className="w-full py-4 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]">
                Save Changes <CheckCircle2 size={18} />
              </button>
            </footer>
          </aside>
        </div>
      )}

      {moveModalState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMoveModalState({ isOpen: false, sessionId: null })}></div>
          <div className="relative bg-surface-glass backdrop-blur-md rounded-2xl p-8 max-w-[420px] w-full shadow-sm border border-border-subtle">
            <h2 className="text-2xl font-bold text-center mb-6">Move Chat</h2>
            <div className="space-y-2 mb-8 max-h-48 overflow-y-auto">
              {foldersList.map(f => (
                <button key={f} onClick={() => executeMove(f)} className="w-full text-left p-4 hover:bg-surface-hover rounded-xl border flex gap-3"><FolderIcon size={18} className="text-primary"/>{f}</button>
              ))}
            </div>
            <div className="border-t border-border-subtle pt-6 flex gap-2">
              <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="flex-1 p-3 bg-background border rounded-xl" placeholder="New folder..."/>
              <button onClick={executeCreateAndMove} disabled={!newFolderName.trim()} className="bg-primary text-content-inverse px-5 py-3 rounded-xl">Move</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative p-3 pt-3 gap-3">
        
        <div className={`absolute md:relative z-40 inset-y-3 left-3 md:inset-auto md:left-auto h-[calc(100%-24px)] md:h-full transition-all duration-300 ease-in-out shrink-0 rounded-2xl overflow-hidden shadow-xl border border-border-subtle/50
          ${isSidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-[120%] md:translate-x-0 md:w-[72px] w-[280px]"}
        `}>
          <Sidebar 
            sessions={sessionsList} folders={foldersList} currentSessionId={currentSessionId} 
            onSelect={handleLoadSession} onNew={handleNewSession} onDelete={handleDeleteSession} 
            onCreateFolder={handleCreateFolder} onDeleteFolder={handleDeleteFolder} 
            onMove={(id) => { setMoveModalState({ isOpen: true, sessionId: id }); setNewFolderName(""); }} 
            language={language}
            onOpenSettings={() => {
              if (userProfile) {
                const isStdRole = ["student", "teacher", "professional"].includes(userProfile.role);
                const isStdLevel = ["primary", "high_school", "university"].includes(userProfile.level);
                const isStdGender = ["female", "male"].includes(userProfile.gender);

                setTempProfile({ 
                  role: isStdRole ? userProfile.role : "other", 
                  iam_custom: isStdRole ? "" : userProfile.role,
                  level: isStdLevel ? userProfile.level : "other", 
                  education_custom: isStdLevel ? "" : userProfile.level,
                  gender: isStdGender ? userProfile.gender : "female", 
                  aiVoice: userProfile.aiVoice as any 
                });
              }
              setSettingsErrors({ role: false, level: false });
              setShowProfileModal(true);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onCloseSidebar={() => {
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            isCollapsed={!isSidebarOpen}
            onExpand={() => setIsSidebarOpen(true)}
          />
        </div>

        {isSidebarOpen && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden rounded-2xl" onClick={() => setIsSidebarOpen(false)} />}

        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-transparent relative border border-transparent md:border-border-subtle/20 rounded-2xl">
          <ChatWindow 
            messages={messages} language={language} aiVoice={userProfile?.aiVoice || "female"} isTyping={isTyping && !messages.some((m) => (m as any).isStreaming)}
            showUpload={showUpload} setShowUpload={setShowUpload} onProcessDocument={handleProcessDocument as any} isUploading={isProcessingDoc}
            onRetry={(id) => handleEditMessage(id, messages[messages.findIndex((m) => m.id === id) - 1]?.content || "")} onEditMessage={handleEditMessage}
          />
          <div className={`relative w-full px-3 md:px-0 z-10 pb-3`}>
            {showUpload && (
              <div className="absolute bottom-full mb-2 w-full flex justify-center px-4 left-0 right-0 z-30">
                <div className="w-full max-w-[500px]">
                  <DocumentUpload language={language} onClose={() => setShowUpload(false)} onProcess={handleProcessDocument as any} isProcessing={isProcessingDoc} />
                </div>
              </div>
            )}
            <ChatInput onSend={handleSendMessage} onToggleUpload={() => setShowUpload(!showUpload)} language={language} isLoading={isTyping || isProcessingDoc} onStopGeneration={stopGeneration} />
          </div>
        </div>
      </div>
    </div>
  );
}
