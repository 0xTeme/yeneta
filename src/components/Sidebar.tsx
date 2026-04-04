"use client";

import { MessageSquare, Plus, Trash2, FolderPlus, Folder as FolderIcon } from "lucide-react";
import { Language } from "@/types";

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
  folder?: string;
}

interface Props {
  sessions: SessionMeta[];
  folders: string[];
  currentSessionId: string;
  onSelect: (id: string) => void;
  onNew: (folderName?: string) => void;
  onDelete: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (name: string) => void;
  onMove: (id: string) => void;
  language: Language;
}

export default function Sidebar({ sessions, folders, currentSessionId, onSelect, onNew, onDelete, onCreateFolder, onDeleteFolder, onMove, language }: Props) {
  const isAmharic = language === "amharic";

  const groupedSessions = sessions.reduce((acc, session) => {
    const f = session.folder || "uncategorized";
    if (!acc[f]) acc[f] = [];
    acc[f].push(session);
    return acc;
  }, {} as Record<string, SessionMeta[]>);

  const handleCreateFolder = () => {
    const name = prompt(isAmharic ? "የአዲሱን አቃፊ ስም ያስገቡ:" : "Enter new folder name:");
    if (name && name.trim()) onCreateFolder(name.trim());
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#1a1a2e] text-white overflow-hidden">
      
      <div className="p-4 border-b border-gray-700 flex gap-2 shrink-0">
        <button
          onClick={() => onNew()}
          className="flex-1 flex items-center justify-center gap-1 bg-[#1a7a4c] hover:bg-[#135c39] transition-colors py-2.5 rounded-lg font-medium text-sm shadow-md"
        >
          <Plus size={16} /> {isAmharic ? "አዲስ" : "Chat"}
        </button>
        <button
          onClick={handleCreateFolder}
          className="px-3 flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg shadow-md"
          title={isAmharic ? "አዲስ አቃፊ" : "New Folder"}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        
        {folders.map((folderName) => (
          <div key={folderName} className="mb-2 bg-black/20 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center bg-gray-800/80 px-3 py-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <FolderIcon size={12} className="text-[#f0a500]" /> {folderName}
              </span>
              <div className="flex gap-1">
                <button onClick={() => onNew(folderName)} className="p-1 hover:text-[#1a7a4c] hover:bg-white/10 rounded" title="New Chat in Folder"><Plus size={14}/></button>
                <button onClick={() => { if(window.confirm("Delete folder? Chats will be kept.")) onDeleteFolder(folderName); }} className="p-1 hover:text-red-500 hover:bg-white/10 rounded" title="Delete Folder"><Trash2 size={14}/></button>
              </div>
            </div>
            
            <div className="p-1">
              {(groupedSessions[folderName] || []).length === 0 && (
                <div className="text-[10px] text-gray-500 p-2 text-center italic">Empty</div>
              )}
              {(groupedSessions[folderName] || []).map((session) => (
                <SessionItem key={session.id} session={session} isCurrent={currentSessionId === session.id} onSelect={onSelect} onDelete={onDelete} onMove={onMove} />
              ))}
            </div>
          </div>
        ))}

        <div className="px-2">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
            {isAmharic ? "ያልተመደቡ ውይይቶች" : "Recent Chats"}
          </h3>
          <div className="space-y-1">
            {(groupedSessions["uncategorized"] || []).map((session) => (
              <SessionItem key={session.id} session={session} isCurrent={currentSessionId === session.id} onSelect={onSelect} onDelete={onDelete} onMove={onMove} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function SessionItem({ session, isCurrent, onSelect, onDelete, onMove }: any) {
  return (
    <div
      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
        isCurrent ? "bg-[#1a7a4c] text-white shadow-md" : "hover:bg-white/5 text-gray-300"
      }`}
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <MessageSquare size={14} className="flex-shrink-0 opacity-70" />
        <div className="truncate text-xs font-medium">{session.title || "New Chat"}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(session.id); }}
          className="text-gray-400 hover:text-blue-300 p-1"
          title="Move to Folder"
        >
          <FolderIcon size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete chat?")) onDelete(session.id); }}
          className="text-gray-400 hover:text-red-300 p-1"
          title="Delete Chat"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
