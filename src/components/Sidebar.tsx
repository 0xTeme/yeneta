"use client";

import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Language } from "@/types";

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}

interface Props {
  sessions: SessionMeta[];
  currentSessionId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  language: Language;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function Sidebar({ sessions, currentSessionId, onSelect, onNew, onDelete, language, isOpen, setIsOpen }: Props) {
  const isAmharic = language === "amharic";

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <button 
            onClick={onNew}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1a7a4c] hover:bg-[#135c39] transition-colors py-2 rounded-lg font-medium text-sm"
          >
            <Plus size={18} />
            {isAmharic ? "አዲስ ውይይት" : "New Chat"}
          </button>
          
          <button 
            className="md:hidden ml-2 p-2 text-gray-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-4">
              {isAmharic ? "ምንም ውይይት የለም" : "No recent chats"}
            </p>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onClick={() => {
                  onSelect(session.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="truncate text-sm font-medium">
                    {session.title || (isAmharic ? "አዲስ ውይይት" : "New Chat")}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="text-gray-500 hover:text-[#e63946] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}