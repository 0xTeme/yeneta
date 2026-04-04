"use client";

import { useState, Fragment } from "react";
import { MessageSquare, Plus, Trash2, FolderPlus, Folder as FolderIcon, LogOut, ChevronDown, ChevronRight, X } from "lucide-react";
import { Language } from "@/types";
import { useSession, signOut } from "next-auth/react";

interface SessionMeta { id: string; title: string; updatedAt: number; folder?: string; }

interface Props {
  sessions: SessionMeta[]; folders: string[]; currentSessionId: string;
  onSelect: (id: string) => void; onNew: (folderName?: string) => void;
  onDelete: (id: string) => void; onCreateFolder: (name: string) => void;
  onDeleteFolder: (name: string) => void; onMove: (id: string) => void;
  language: Language; isCollapsed: boolean; 
}

type ModalType = 'none' | 'addFolder' | 'deleteFolder' | 'deleteChat' | 'account' | 'deleteAccount';

export default function Sidebar({ sessions, folders, currentSessionId, onSelect, onNew, onDelete, onCreateFolder, onDeleteFolder, onMove, language, isCollapsed }: Props) {
  const { data: session } = useSession();
  const isAmharic = language === "amharic";

  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  
  const [modal, setModal] = useState<{ type: ModalType, payload?: string }>({ type: 'none' });
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");

  const groupedSessions = sessions.reduce((acc, s) => {
    const f = s.folder || "uncategorized";
    if (!acc[f]) acc[f] = [];
    acc[f].push(s);
    return acc;
  }, {} as Record<string, SessionMeta[]>);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const submitAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    
    if (folders.some(f => f.toLowerCase() === name.toLowerCase())) {
      setFolderError(isAmharic ? "ይህ ስም አስቀድሞ ጥቅም ላይ ውሏል። እባክዎ ሌላ ይምረጡ።" : "This folder already exists. Please choose a different name.");
      return;
    }
    
    onCreateFolder(name);
    setModal({ type: 'none' });
  };

  return (
    <Fragment>
      <div className="flex flex-col w-full h-full bg-[#1a1a2e] text-white overflow-hidden">
        
        <div className={`p-4 border-b border-gray-700 flex shrink-0 ${isCollapsed ? "flex-col items-center gap-3" : "gap-2"}`}>
          <button onClick={() => onNew()} title="New Chat" className={`flex items-center justify-center gap-2 bg-[#1a7a4c] hover:bg-[#135c39] transition-all rounded-lg font-medium text-sm shadow-md ${isCollapsed ? "w-10 h-10 p-0" : "flex-1 py-2.5"}`}>
            <Plus size={18} /> {!isCollapsed && (isAmharic ? "አዲስ" : "New Chat")}
          </button>
          <button onClick={() => { setModal({ type: 'addFolder' }); setNewFolderName(''); setFolderError(''); }} title={isAmharic ? "አዲስ አቃፊ" : "New Folder"} className={`flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg shadow-md ${isCollapsed ? "w-10 h-10 p-0" : "px-3 py-2.5"}`}>
            <FolderPlus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {!isCollapsed && (
            <Fragment>
              {folders.map((folderName) => {
                const isFolderClosed = collapsedFolders[folderName];
                return (
                  <div key={folderName} className="mb-2 bg-black/20 rounded-xl border border-gray-800 overflow-hidden transition-all">
                    <div onClick={() => toggleFolder(folderName)} className="flex justify-between items-center px-3 py-2 bg-gray-800/80 cursor-pointer hover:bg-gray-700/80 transition-colors select-none" title={`Folder: ${folderName}`}>
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-1">
                        {isFolderClosed ? <ChevronRight size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                        <FolderIcon size={12} className="text-[#f0a500] ml-1" /> {folderName}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onNew(folderName)} className="p-1 hover:text-[#1a7a4c] hover:bg-white/10 rounded" title="New chat in folder"><Plus size={14}/></button>
                        <button onClick={() => setModal({ type: 'deleteFolder', payload: folderName })} className="p-1 hover:text-red-500 hover:bg-white/10 rounded" title="Delete folder"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    
                    {!isFolderClosed && (
                      <div className="p-1 animate-in slide-in-from-top-2 duration-200">
                        {(groupedSessions[folderName] || []).length === 0 && <div className="text-[10px] text-gray-500 p-2 text-center italic">Empty</div>}
                        {(groupedSessions[folderName] || []).map((s) => (
                          <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={onSelect} onMove={onMove} onDelete={() => setModal({ type: 'deleteChat', payload: s.id })} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="px-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">
                  {isAmharic ? "ያልተመደቡ ውይይቶች" : "Recent Chats"}
                </h3>
                <div className="space-y-1">
                  {(groupedSessions["uncategorized"] || []).map((s) => (
                    <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={onSelect} onMove={onMove} onDelete={() => setModal({ type: 'deleteChat', payload: s.id })} />
                  ))}
                </div>
              </div>
            </Fragment>
          )}
        </div>

        <div className={`p-3 border-t border-gray-700 hover:bg-white/5 transition-colors cursor-pointer flex items-center shrink-0 ${isCollapsed ? "justify-center" : "justify-between"}`} onClick={() => setModal({ type: 'account' })} title="Account Settings">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={session?.user?.image || "https://www.gravatar.com/avatar/0?d=mp"} className="w-8 h-8 rounded-full border border-gray-600 shrink-0" alt="Profile" />
            {!isCollapsed && (
              <div className="flex flex-col text-sm truncate max-w-[130px]">
                <span className="font-bold text-gray-200 truncate">{session?.user?.name || "User"}</span>
                <span className="text-[10px] text-gray-400 truncate">{session?.user?.email || ""}</span>
              </div>
            )}
          </div>
          {!isCollapsed && <LogOut size={16} className="text-gray-500 shrink-0" />}
        </div>
      </div>

      {modal.type !== 'none' && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          
          {modal.type === 'addFolder' && (
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in text-left text-[#1a1a2e]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{isAmharic ? "አዲስ አቃፊ ይፍጠሩ" : "Create New Folder"}</h2>
                <button onClick={() => setModal({type: 'none'})} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
              </div>
              <input 
                autoFocus
                type="text" 
                value={newFolderName} 
                onChange={e => { setNewFolderName(e.target.value); setFolderError(''); }} 
                placeholder={isAmharic ? "የአቃፊ ስም..." : "Folder name..."}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1a7a4c] text-sm" 
              />
              {folderError && <p className="text-red-500 text-xs mt-2 font-medium">{folderError}</p>}
              
              <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {isAmharic ? "ያሉ አቃፊዎች" : "Available Folders"}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                   {folders.map(f => <span key={f} className="text-xs font-semibold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md">{f}</span>)}
                   {folders.length === 0 && <span className="text-xs text-gray-400 italic">No folders yet.</span>}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => setModal({type: 'none'})} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={submitAddFolder} disabled={!newFolderName.trim()} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1a7a4c] hover:bg-[#135c39] disabled:opacity-50 transition-colors shadow">Create</button>
              </div>
            </div>
          )}

          {modal.type === 'deleteFolder' && (
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in text-center">
              <div className="w-16 h-16 bg-red-100 text-[#e63946] flex items-center justify-center rounded-full mx-auto mb-4"><Trash2 size={24}/></div>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">{isAmharic ? "አቃፊን ሰርዝ" : "Delete Folder?"}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {isAmharic ? "ይህን አቃፊ መሰረዝ እርግጠኛ ነዎት? በውስጡ ያሉ ውይይቶች አይሰረዙም።" : `Are you sure you want to delete the "${modal.payload}" folder? The chats inside will be kept and moved to Recent.`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setModal({type: 'none'})} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => { onDeleteFolder(modal.payload!); setModal({type: 'none'}); }} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#e63946] hover:bg-red-700 transition-colors shadow">Delete</button>
              </div>
            </div>
          )}

          {modal.type === 'deleteChat' && (
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in text-center">
              <div className="w-16 h-16 bg-red-100 text-[#e63946] flex items-center justify-center rounded-full mx-auto mb-4"><Trash2 size={24}/></div>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">{isAmharic ? "ውይይቱን ሰርዝ" : "Delete Chat?"}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {isAmharic ? "ይህን ውይይት መሰረዝ እርግጠኛ ነዎት? ይህ ድርጊት ሊቀለበስ አይችልም።" : "Are you sure you want to permanently delete this chat? This action cannot be undone."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setModal({type: 'none'})} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => { onDelete(modal.payload!); setModal({type: 'none'}); }} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#e63946] hover:bg-red-700 transition-colors shadow">Delete</button>
              </div>
            </div>
          )}

          {modal.type === 'account' && (
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in text-center">
              <div className="w-20 h-20 bg-gray-100 flex items-center justify-center rounded-full mx-auto mb-4 border-4 border-white shadow-sm">
                <img src={session?.user?.image || "https://www.gravatar.com/avatar/0?d=mp"} className="w-full h-full rounded-full object-cover" alt="Profile" />
              </div>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-1">{session?.user?.name || "User"}</h2>
              <p className="text-gray-500 text-sm mb-6">{session?.user?.email || ""}</p>
              
              <div className="flex flex-col gap-3">
                <button onClick={() => signOut()} className="w-full py-3 rounded-xl font-bold text-[#1a1a2e] bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm">
                  {isAmharic ? "ውጣ (Sign Out)" : "Sign Out"}
                </button>
                <button onClick={() => setModal({type: 'deleteAccount'})} className="w-full py-3 rounded-xl font-bold text-[#e63946] bg-red-50 hover:bg-red-100 transition-colors">
                  {isAmharic ? "አካውንት ሰርዝ (Delete Account)" : "Delete Account"}
                </button>
                <button onClick={() => setModal({type: 'none'})} className="w-full py-2 rounded-xl font-bold text-gray-400 hover:text-gray-600 transition-colors mt-2">
                  {isAmharic ? "ተመለስ" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {modal.type === 'deleteAccount' && (
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in text-center">
              <div className="w-16 h-16 bg-red-100 text-[#e63946] flex items-center justify-center rounded-full mx-auto mb-4"><Trash2 size={24}/></div>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">{isAmharic ? "አካውንትዎን ይሰርዙ?" : "Delete Account?"}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {isAmharic 
                  ? "በእርግጠኝነት አካውንትዎን ማጥፋት ይፈልጋሉ? ይህ ሁሉንም ውይይቶችዎን እና መቼቶችዎን ያጠፋል። ይህ ድርጊት ሊቀለበስ አይችልም።" 
                  : "Are you sure? This will permanently delete all your chats, folders, and profile settings. This action cannot be undone."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setModal({type: 'account'})} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => { 
                  localStorage.clear(); 
                  signOut(); 
                }} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#e63946] hover:bg-red-700 transition-colors shadow">Delete Everything</button>
              </div>
            </div>
          )}

        </div>
      )}
    </Fragment>
  );
}

function SessionItem({ session, isCurrent, onSelect, onDelete, onMove }: any) {
  return (
    <div
      title={session.title}
      className={`group flex items-center p-2.5 rounded-lg cursor-pointer transition-colors justify-between ${isCurrent ? "bg-[#1a7a4c] text-white shadow-md" : "hover:bg-white/5 text-gray-300"}`}
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <MessageSquare size={14} className={`flex-shrink-0 ${isCurrent ? "opacity-100" : "opacity-70"}`} />
        <div className="truncate text-xs font-medium">{session.title || "New Chat"}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMove(session.id); }} className="text-gray-400 hover:text-blue-300 p-1" title="Move to Folder"><FolderIcon size={12} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-400 hover:text-red-300 p-1" title="Delete"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}