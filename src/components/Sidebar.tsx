"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Plus, Trash2, FolderPlus, Folder as FolderIcon, ChevronDown, ChevronRight, X, Settings, LogOut, Search } from "lucide-react";
import { Language } from "@/types";
import { useSession, signOut } from "next-auth/react";

interface SessionMeta { id: string; title: string; updatedAt: number; folder?: string; messages?: any[]; }

interface Props {
  sessions: SessionMeta[]; folders: string[]; currentSessionId: string;
  onSelect: (id: string) => void; onNew: (folderName?: string) => void;
  onDelete: (id: string) => void; onCreateFolder: (name: string) => void;
  onDeleteFolder: (name: string) => void; onMove: (id: string) => void;
  language: Language; 
  onOpenSettings: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onCloseSidebar: () => void;
  isCollapsed: boolean;
  onExpand: () => void;
}

type ModalType = 'none' | 'addFolder' | 'deleteFolder' | 'deleteChat' | 'account' | 'signOut';

export default function Sidebar({ sessions, folders, currentSessionId, onSelect, onNew, onDelete, onCreateFolder, onDeleteFolder, onMove, language, onOpenSettings, searchQuery, setSearchQuery, onCloseSidebar, isCollapsed, onExpand }: Props) {
  const { data: session } = useSession();
  const isAmharic = language === "amharic";

  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ type: ModalType, payload?: string }>({ type: 'none' });
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  
  // Ref to track if sidebar was previously collapsed (for auto-focus search on expand)
  const prevCollapsedRef = useRef(isCollapsed);
  
  // Ref for the search input to enable auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when sidebar transitions from collapsed → expanded
  useEffect(() => {
    if (!isCollapsed && prevCollapsedRef.current) {
      searchInputRef.current?.focus();
    }
    prevCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.type !== 'none') setModal({ type: 'none' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.type]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const submitAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.some(f => f.toLowerCase() === name.toLowerCase())) {
      setFolderError(isAmharic ? "ይህ ፎልደር አስቀድሞ አለ። እባክዎ የተለየ ስም ይምረጡ።" : "This folder already exists. Please choose a different name.");
      return;
    }
    onCreateFolder(name);
    setModal({ type: 'none' });
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = s.title?.toLowerCase().includes(q);
    const matchMessages = s.messages?.some(m => m.content?.toLowerCase().includes(q));
    return matchTitle || matchMessages;
  });

  const groupedSessions = filteredSessions.reduce((acc, s) => {
    const f = s.folder || "uncategorized";
    if (!acc[f]) acc[f] = [];
    acc[f].push(s);
    return acc;
  }, {} as Record<string, SessionMeta[]>);

  const handleSessionSelect = (id: string) => {
    onSelect(id);
    onCloseSidebar();
  };

  // ----------------------------------------------------------------------
  // MINI SIDEBAR COMPONENT (Collapsed Desktop Mode)
  // ----------------------------------------------------------------------
  if (isCollapsed) {
    return (
      <div className="flex flex-col justify-between items-center w-full h-full bg-surface/95 backdrop-blur-md py-4">
        <div className="flex flex-col gap-3 items-center w-full">
          <button onClick={onExpand} title="Expand Sidebar" className="w-10 h-10 flex items-center justify-center text-content-muted hover:text-primary bg-surface hover:bg-surface-hover transition-colors rounded-xl border border-border-subtle">
            <Search size={18} />
          </button>
          <button onClick={() => onNew()} title={isAmharic ? "አዲስ ቻት" : "New Chat"} className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary-hover text-content-inverse transition-transform active:scale-95 rounded-xl shadow-sm">
            <Plus size={20} />
          </button>
          <button onClick={() => { setModal({ type: 'addFolder' }); setNewFolderName(''); setFolderError(''); }} title={isAmharic ? "አዲስ ፎልደር" : "New Folder"} className="w-10 h-10 flex items-center justify-center text-content-muted hover:text-content bg-surface hover:bg-surface-hover transition-colors rounded-xl border border-border-subtle">
            <FolderPlus size={18} />
          </button>
        </div>

        <div className="mt-auto">
          <button onClick={() => setModal({ type: 'account' })} title="Account Settings" className="h-10 w-10 rounded-full overflow-hidden border border-border-strong ring-2 ring-primary/20 hover:ring-primary/50 transition-all focus:outline-none">
            <img src={session?.user?.image || "https://www.gravatar.com/avatar/0?d=mp"} className="w-full h-full object-cover" alt="Profile" />
          </button>
        </div>

        {/* Modal Portals are shared and rendered at the bottom */}
        <SidebarModals />
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // EXPANDED SIDEBAR COMPONENT (Desktop Expanded & Mobile Overlay)
  // ----------------------------------------------------------------------
  return (
    <div className="flex flex-col justify-between w-full h-full bg-surface/95 backdrop-blur-md text-content overflow-hidden">
      
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative w-full group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-primary transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAmharic ? "ቻቶችን ፈልግ..." : "Search chats..."}
            className="w-full bg-background border border-border-strong rounded-xl py-2 pl-9 pr-8 text-sm text-content outline-none focus:ring-2 focus:ring-primary/30 transition-all font-body"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-content-muted hover:text-content">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="h-px bg-border-subtle mx-4 shrink-0 my-1" />

      {/* Chat Actions */}
      <div className="flex shrink-0 gap-2 flex-row items-center p-4">
        <button onClick={() => { onNew(); onCloseSidebar(); }} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-content-inverse transition-transform active:scale-95 rounded-lg font-bold tracking-wide shadow-sm flex-1 h-10 px-3 text-[0.6875rem]">
          <Plus size={18} /> {isAmharic ? "አዲስ ቻት" : "New Chat"}  
        </button>
        <button onClick={() => { setModal({ type: 'addFolder' }); setNewFolderName(''); setFolderError(''); }} title={isAmharic ? "አዲስ ፎልደር" : "New Folder"} className="flex items-center justify-center text-content-muted hover:text-content bg-surface hover:bg-surface-hover transition-all duration-200 rounded-lg border border-border-subtle shrink-0 w-10 h-10 p-0">
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
        {folders.map((folderName) => {
          const hasMatches = groupedSessions[folderName] && groupedSessions[folderName].length > 0;
          if (searchQuery.trim() && !hasMatches) return null; 
          
          const isFolderClosed = !searchQuery.trim() && collapsedFolders[folderName];
          
          return (
            <div key={folderName} className="mb-2 bg-surface rounded-xl border border-border-subtle overflow-hidden transition-all duration-300">
              <div onClick={() => toggleFolder(folderName)} className="flex items-center cursor-pointer hover:bg-surface-hover transition-colors group select-none justify-between px-4 py-3">
                <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-wider flex items-center gap-2 font-label">
                  {isFolderClosed ? <ChevronRight size={14} className="opacity-50"/> : <ChevronDown size={14} className="opacity-50"/>}
                  <FolderIcon size={14} className="text-primary" /> 
                  {folderName}
                </span>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { onNew(folderName); onCloseSidebar(); }} className="p-1 hover:text-primary hover:bg-surface-hover rounded transition-colors"><Plus size={14}/></button>
                  <button onClick={() => setModal({ type: 'deleteFolder', payload: folderName })} className="p-1 hover:text-error-text hover:bg-error-muted rounded transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
              
              {!isFolderClosed && (
                <div className="p-1.5 animate-in slide-in-from-top-1 duration-200 bg-background/50">
                  {(groupedSessions[folderName] || []).length === 0 && <div className="text-[0.6875rem] text-content-muted p-3 text-center italic font-label">Empty</div>}
                  {(groupedSessions[folderName] || []).map((s) => (
                    <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={handleSessionSelect} onMove={onMove} onDelete={() => setModal({ type: 'deleteChat', payload: s.id })} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {(groupedSessions["uncategorized"] || []).length > 0 && (
          <div className="pt-2">
            <h3 className="text-[0.6rem] font-bold text-content-muted opacity-70 uppercase tracking-widest mb-2 px-2 font-label">
              {isAmharic ? "የቅርብ ጊዜ ቻቶች" : "Recent Chats"}
            </h3>
            <div className="space-y-1">
              {(groupedSessions["uncategorized"] || []).map((s) => (
                <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={handleSessionSelect} onMove={onMove} onDelete={() => setModal({ type: 'deleteChat', payload: s.id })} />
              ))}
            </div>
          </div>
        )}

        {searchQuery.trim() && Object.keys(groupedSessions).length === 0 && (
           <div className="text-sm text-content-muted text-center py-10 italic">No chats found.</div>
        )}
      </div>

      {/* Bottom Profile Settings */}
      <div className="shrink-0 border-t border-border-subtle p-4">
        <div className="flex items-center gap-3 bg-surface rounded-xl border border-border-subtle hover:bg-surface-hover transition-all duration-200 cursor-pointer group active:scale-[0.98] px-3 py-3" onClick={() => setModal({ type: 'account' })}>
          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-border-strong ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
            <img src={session?.user?.image || "https://www.gravatar.com/avatar/0?d=mp"} className="w-full h-full object-cover" alt="Profile" />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-[0.75rem] font-bold text-content truncate font-headline">{session?.user?.name || "User"}</span>
            <span className="text-[0.6rem] text-content-muted truncate font-label tracking-wider">{session?.user?.email || ""}</span>
          </div>
          <Settings size={16} className="text-content-muted group-hover:text-content transition-colors shrink-0" />
        </div>
      </div>

      <SidebarModals />
    </div>
  );

  // ----------------------------------------------------------------------
  // SHARED MODALS & COMPONENTS
  // ----------------------------------------------------------------------
  function SidebarModals() {
    if (modal.type === 'none') return null;
    return createPortal((
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in" onClick={() => setModal({ type: 'none' })}></div>
        
        {modal.type === 'addFolder' && (
          <div className="relative z-10 w-full max-w-[420px] bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-8 shadow-lg animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-content tracking-tight font-headline">{isAmharic ? "ፎልደር ፍጠር" : "Create Folder"}</h2>      
              <button onClick={() => setModal({type: 'none'})} className="text-content-muted hover:text-content bg-surface hover:bg-surface-hover p-2 rounded-full transition-colors border border-border-subtle"><X size={18}/></button>
            </div>
            <input autoFocus type="text" value={newFolderName} onChange={e => { setNewFolderName(e.target.value); setFolderError(''); }} onKeyDown={e => e.key === 'Enter' && submitAddFolder()} placeholder={isAmharic ? "የፎልደር ስም..." : "Folder name..."} className="w-full p-4 bg-background border border-border-strong rounded-xl outline-none focus:border-primary text-sm text-content placeholder-content-muted transition-colors font-body" />
            {folderError && <p className="text-error-text text-[0.6875rem] mt-2 font-medium tracking-wide">{folderError}</p>}
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModal({type: 'none'})} className="flex-1 py-3.5 rounded-xl font-bold text-content bg-surface hover:bg-surface-hover transition-colors text-sm font-headline border border-border-strong">Cancel</button>
              <button onClick={submitAddFolder} disabled={!newFolderName.trim()} className="flex-1 py-3.5 rounded-xl font-bold text-content-inverse bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm text-sm font-headline">Create</button>
            </div>
          </div>
        )}

        {modal.type === 'account' && (
          <div className="relative z-10 w-full max-w-[420px] bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-8 shadow-lg animate-in zoom-in duration-300 text-center">
            <div className="w-24 h-24 bg-background flex items-center justify-center rounded-full mx-auto mb-5 outline outline-4 outline-primary/20 shadow-sm overflow-hidden">
              <img src={session?.user?.image || "https://www.gravatar.com/avatar/0?d=mp"} className="w-full h-full object-cover" alt="Profile" />
            </div>
            <h2 className="text-xl font-bold text-content mb-1 tracking-tight font-headline">{session?.user?.name || "User"}</h2>
            <p className="text-content-muted text-[0.6875rem] tracking-widest uppercase mb-8 font-label">{session?.user?.email || ""}</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => { setModal({type: 'none'}); onOpenSettings(); }} className="w-full py-3.5 rounded-xl font-bold text-primary bg-primary-muted hover:bg-primary/20 outline outline-1 outline-primary/30 transition-colors text-sm font-headline flex items-center justify-center gap-2">
                <Settings size={18} /> {isAmharic ? "ማስተካከያ" : "Profile Settings"}
              </button>

              <button onClick={() => setModal({type: 'signOut'})} className="w-full py-3.5 rounded-xl font-bold text-content hover:text-error-text bg-surface hover:bg-error-muted outline outline-1 outline-border-subtle hover:outline-error-base/30 transition-colors text-sm mt-2 font-headline flex items-center justify-center gap-2 group">
                <LogOut size={18} className="text-content-muted group-hover:text-error-text transition-colors" />
                {isAmharic ? "ውጣ" : "Sign Out"}     
              </button>
              
              <button onClick={() => setModal({type: 'none'})} className="w-full py-2 rounded-xl font-bold text-content-muted hover:text-content transition-colors mt-2 text-[0.6875rem] uppercase tracking-widest font-label">
                {isAmharic ? "ዝጋ" : "Close"}          
              </button>
            </div>
          </div>
        )}

        {['deleteFolder', 'deleteChat', 'signOut'].includes(modal.type) && (
          <div className="relative z-10 w-full max-w-[420px] bg-surface backdrop-blur-md border border-border-subtle rounded-2xl p-8 shadow-lg animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-error-muted border border-error-base/20 flex items-center justify-center mb-8">
                <div className="w-14 h-14 rounded-full bg-error-base/20 flex items-center justify-center">
                  {modal.type === 'signOut' ? <LogOut size={28} className="text-error-text" /> : <Trash2 size={28} className="text-error-text" />}
                </div>
              </div>
              
              <div className="space-y-3 mb-10">
                <h2 className="text-2xl font-bold text-content font-headline">
                  {modal.type === 'signOut' ? (isAmharic ? "ውጣ" : "Sign Out") :
                   modal.type === 'deleteFolder' ? (isAmharic ? "ፎልደሩን ሰርዝ?" : "Delete Folder?") :   
                   (isAmharic ? "ቻቱን ሰርዝ?" : "Delete Chat?")}   
                </h2>
                <p className="text-content-muted text-[15px] leading-relaxed font-body">
                  {modal.type === 'signOut' 
                    ? (isAmharic ? "እርግጠኛ ነዎት መውጣት ይፈልጋሉ?" : "Are you sure you want to log out of your session?")
                    : modal.type === 'deleteFolder' 
                    ? (isAmharic ? `እርግጠኛ ነዎት "${modal.payload}" ፎልደርን መሰረዝ ይፈልጋሉ? በውስጡ ያሉት ቻቶች አይጠፉም።` : `Are you sure you want to delete the "${modal.payload}" folder? The chats inside will be kept.`)
                    : (isAmharic ? "ይህን ቻት በእርግጠኝነት መሰረዝ ይፈልጋሉ? ይህ ድርጊት ወደ ኋላ አይመለስም።" : "This action cannot be undone. All messages will be permanently removed.")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setModal({ type: 'none' })} className="py-4 px-6 bg-surface hover:bg-surface-hover text-content rounded-xl text-sm font-bold transition-all border border-border-strong font-headline">
                  Cancel
                </button>
                <button onClick={() => {
                    if (modal.type === 'signOut') { localStorage.clear(); signOut(); }
                    else if (modal.type === 'deleteFolder') { onDeleteFolder(modal.payload!); setModal({type: 'none'}); }
                    else if (modal.type === 'deleteChat') { onDelete(modal.payload!); setModal({type: 'none'}); }
                  }} 
                  className="py-4 px-6 bg-error-muted text-error-text hover:bg-error-base hover:text-content-inverse dark:bg-error-base dark:text-content-inverse dark:hover:bg-error-hover rounded-xl text-sm font-bold shadow-sm transition-all font-headline"
                >
                  {modal.type === 'signOut' ? (isAmharic ? "ውጣ" : "Sign Out") : (isAmharic ? "ሰርዝ" : "Delete")}   
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    ), document.body);
  }
}

function SessionItem({ session, isCurrent, onSelect, onDelete, onMove }: any) {
  return (
    <div
      title={session.title}
      className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ease-in-out border mb-1 justify-between ${
        isCurrent 
          ? "bg-primary text-content-inverse shadow-sm border-primary" 
          : "hover:bg-surface-hover border-transparent text-content-muted hover:text-content"
      }`}
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <MessageSquare size={18} className={`flex-shrink-0 ${isCurrent ? "text-content-inverse" : ""}`} />
        <span className="text-sm font-medium truncate font-body">{session.title || "New Chat"}</span>
      </div>
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMove(session.id); }} className="p-1 hover:bg-surface rounded-lg transition-all" title="Move to Folder">
          <FolderIcon size={18} className="text-content-muted hover:text-primary" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-error-muted rounded-lg transition-all" title="Delete">
          <Trash2 size={18} className="text-error-text/80 hover:text-error-text"/>
        </button>
      </div>
    </div>
  );
}
