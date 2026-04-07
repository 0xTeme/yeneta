"use client";

import { Message, Language } from "@/types";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import sql from "highlight.js/lib/languages/sql";
import "highlight.js/styles/github-dark.css";
import SpeakButton from "./SpeakButton";
import QuizCard from "./QuizCard";
import StreamMarkdown from "./StreamMarkdown";
import { FileText, Image as ImageIcon, Copy, Check, Edit2, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, memo, useCallback } from "react";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("sql", sql);

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
}

interface Props {
  message: ExtendedMessage;
  language: Language;
  aiVoice: "male" | "female";
  onEdit?: (id: string, newText: string) => void;
  onRetry?: (id: string) => void;
}

const MessageBubble = memo(function MessageBubble({ message, language, aiVoice, onEdit, onRetry }: Props) {
  const isUser = message.role === "user";
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [displayLang, setDisplayLang] = useState<'english' | 'amharic'>(language === 'amharic' ? 'amharic' : 'english');

  useEffect(() => {
    setDisplayLang(language === 'amharic' ? 'amharic' : 'english');
  }, [language]);

  const submitEdit = useCallback(() => {
    if (onEdit && editText.trim() !== message.content) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  }, [onEdit, message.id, message.content, editText]);

  // Safely Extract Dual Language JSON
  let parsedContent = message.content;
  let isDualLang = false;

  if (!isUser && message.content) {
    const cleanContent = message.content.replace(/^```json\n?/, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed.english && parsed.amharic) {
        isDualLang = true;
        parsedContent = displayLang === 'english' ? parsed.english : parsed.amharic;
        if (typeof parsedContent === 'object') parsedContent = JSON.stringify(parsedContent);
      }
    } catch {
      if (message.isStreaming) {
        isDualLang = true; 
        if (displayLang === 'english') {
          const match = cleanContent.match(/"english"\s*:\s*(?:"([^]*?)(?:",\s*"amharic"|$)|({[^]*?)(?:,\s*"amharic"|$))/);
          if (match) parsedContent = match[1] ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : match[2];
        } else {
          const match = cleanContent.match(/"amharic"\s*:\s*(?:"([^]*?)(?:"\s*}|$)|({[^]*?)(?:\s*}|$))/);
          if (match) {
            parsedContent = match[1] ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : match[2];
          } else {
            parsedContent = "ተርጉም ላይ ነው... (Translating...)";
          }
        }
      }
    }
  }

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(parsedContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [parsedContent]);

  // Handle Quiz Cards
  if (message.type === "quiz" && !message.isStreaming && !isUser) {
    let quizData;
    try { quizData = JSON.parse(parsedContent); } catch { return null; }
    return (
      <div className="flex flex-col w-full items-start my-4">
        <QuizCard quiz={quizData} language={language} />
        {isDualLang && (
          <div className="mt-3 flex bg-background border border-border-strong rounded-lg p-1 shadow-sm">
            <button onClick={() => setDisplayLang('english')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${displayLang === 'english' ? 'bg-surface shadow-sm text-content' : 'text-content-muted hover:text-content'}`}>English</button>
            <button onClick={() => setDisplayLang('amharic')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${displayLang === 'amharic' ? 'bg-surface shadow-sm text-content' : 'text-content-muted hover:text-content'}`}>አማርኛ</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2 w-full my-4 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div className="flex items-center gap-3 mb-1">
        {!isUser && <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-content-inverse text-[10px] font-bold shadow-sm">Y</div>}
        <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-widest font-label">
          {isUser ? (language === "amharic" ? "አንተ" : "You") : (language === "amharic" ? "የኔታ" : "Yeneta Assistant")}
        </span>
      </div>

      <div className={`group max-w-[90%] md:max-w-[85%] rounded-2xl p-5 shadow-sm transition-all duration-300 border ${
          isUser ? "bg-primary text-content-inverse rounded-tr-none border-primary" : "bg-surface-glass backdrop-blur-md border-border-subtle text-content rounded-tl-none markdown-content"
        }`}>
        
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-3 py-1">
            <Loader2 size={20} className="text-primary animate-spin" />
            <span className="text-primary text-sm font-bold tracking-wide font-headline">Processing...</span>
          </div>
        ) : (
          <>
            {message.fileName && (
              <div className={`flex items-center gap-2 mb-3 pb-3 text-xs font-semibold tracking-wide border-b ${isUser ? "border-white/20 text-content-inverse" : "border-border-subtle text-content-muted"}`}>
                {message.type === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}
                <span className="truncate">{message.fileName}</span>
              </div>
            )}

            {isEditing ? (
              <div className="flex flex-col gap-3">
                <textarea className="w-full bg-black/5 p-3 rounded-xl outline-none resize-none text-content text-sm" value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={() => setIsEditing(false)} className="text-xs px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-hover text-content font-semibold border border-border-subtle">Cancel</button>
                  <button onClick={submitEdit} className="text-xs px-4 py-2.5 rounded-lg bg-primary text-content-inverse font-bold hover:bg-primary-hover">Save</button>
                </div>
              </div>
            ) : (
              <div className={`font-body leading-relaxed text-sm ${isUser ? "user-markdown" : ""} ${message.isStreaming && !isUser ? "typing-cursor" : ""}`}>
                <StreamMarkdown content={parsedContent} isStreaming={message.isStreaming && !isUser} />
              </div>
            )}

            {/* AI Action Bar & Translate Toggle Bottom Placed */}
            {!isUser && !message.isStreaming && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-border-subtle">
                {isDualLang ? (
                  <div className="flex bg-background border border-border-strong rounded-lg p-1 shadow-sm w-max">
                    <button onClick={() => setDisplayLang('english')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${displayLang === 'english' ? 'bg-surface shadow-sm text-content' : 'text-content-muted hover:text-content'}`}>English</button>
                    <button onClick={() => setDisplayLang('amharic')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${displayLang === 'amharic' ? 'bg-surface shadow-sm text-content' : 'text-content-muted hover:text-content'}`}>አማርኛ</button>
                  </div>
                ) : <div />}
                
                <div className="flex items-center gap-2 self-end sm:self-auto text-content-muted">
                  <div className="hover:bg-surface-hover p-1 rounded-lg transition-colors">
                    <SpeakButton text={parsedContent} gender={aiVoice} />
                  </div>
                  <button onClick={handleCopyText} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors">
                    {copiedText ? <Check size={14} className="text-primary" /> : <Copy size={14} />} Copy
                  </button>
                  {onRetry && (
                    <button onClick={() => onRetry(message.id)} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors">
                      <RefreshCw size={14}/> Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* User Message Edit / Copy */}
            {isUser && !isEditing && (
               <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-white/20 text-content-inverse/80">
                 <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg hover:bg-black/10 flex items-center gap-1.5 text-xs font-semibold"><Edit2 size={14}/> Edit</button>
                 <button onClick={handleCopyText} className="p-2 rounded-lg hover:bg-black/10 flex items-center gap-1.5 text-xs font-semibold">
                   {copiedText ? <Check size={14} className="text-content-inverse" /> : <Copy size={14} />} Copy
                 </button>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;