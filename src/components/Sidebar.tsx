"use client";

import { MessageSquare, Plus, Trash2, FolderPlus, Folder as FolderIcon, LogOut } from "lucide-react";
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

export default function Sidebar({ sessions, folders, currentSessionId, onSelect, onNew, onDelete, onCreateFolder, onDeleteFolder, onMove, language, isCollapsed }: Props) {
  const { data: session } = useSession();
  const isAmharic = language === "amharic";

  const groupedSessions = sessions.reduce((acc, s) => {
    const f = s.folder || "uncategorized";
    if (!acc[f]) acc[f] = [];
    acc[f].push(s);
    return acc;
  }, {} as Record<string, SessionMeta[]>);

  const handleCreateFolder = () => {
    const name = prompt(isAmharic ? "አዲስ አቃፊ ስም ያስገቡ:" : "Enter new folder name:");
    if (name && name.trim()) onCreateFolder(name.trim());
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#1a1a2e] text-white overflow-hidden">
      
      {/* Top Action Buttons */}
      <div className={`p-4 border-b border-gray-700 flex shrink-0 ${isCollapsed ? "flex-col items-center gap-3" : "gap-2"}`}>
        <button onClick={() => onNew()} title="New Chat" className={`flex items-center justify-center gap-2 bg-[#1a7a4c] hover:bg-[#135c39] transition-all rounded-lg font-medium text-sm shadow-md ${isCollapsed ? "w-10 h-10 p-0" : "flex-1 py-2.5"}`}>
          <Plus size={18} /> {!isCollapsed && (isAmharic ? "አዲስ" : "New Chat")}
        </button>
        <button onClick={handleCreateFolder} title={isAmharic ? "አዲስ አቃፊ" : "New Folder"} className={`flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg shadow-md ${isCollapsed ? "w-10 h-10 p-0" : "px-3 py-2.5"}`}>
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Chat List (Fills available space, hidden when collapsed) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {!isCollapsed && (
          <>
            {folders.map((folderName) => (
              <div key={folderName} className="mb-2 bg-black/20 rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex justify-between items-center px-3 py-2 bg-gray-800/80" title={`Folder: ${folderName}`}>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                    <FolderIcon size={12} className="text-[#f0a500]" /> {folderName}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => onNew(folderName)} className="p-1 hover:text-[#1a7a4c] hover:bg-white/10 rounded"><Plus size={14}/></button>
                    <button onClick={() => { if(window.confirm("Delete folder?")) onDeleteFolder(folderName); }} className="p-1 hover:text-red-500 hover:bg-white/10 rounded"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="p-1">
                  {(groupedSessions[folderName] || []).map((s) => (
                    <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={onSelect} onDelete={onDelete} onMove={onMove} />
                  ))}
                </div>
              </div>
            ))}

            <div className="px-1">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">
                {isAmharic ? "ያልተመደቡ ውይይቶች" : "Recent Chats"}
              </h3>
              <div className="space-y-1">
                {(groupedSessions["uncategorized"] || []).map((s) => (
                  <SessionItem key={s.id} session={s} isCurrent={currentSessionId === s.id} onSelect={onSelect} onDelete={onDelete} onMove={onMove} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pinned Bottom User Profile */}
      <div 
        className={`p-3 border-t border-gray-700 hover:bg-white/5 transition-colors cursor-pointer flex items-center shrink-0 ${isCollapsed ? "justify-center" : "justify-between"}`} 
        onClick={() => { if(window.confirm("Sign out of Yeneta?")) signOut(); }} 
        title="Sign Out"
      >
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
        <button onClick={(e) => { e.stopPropagation(); onMove(session.id); }} className="text-gray-400 hover:text-blue-300 p-1"><FolderIcon size={12} /></button>
        <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete chat?")) onDelete(session.id); }} className="text-gray-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}