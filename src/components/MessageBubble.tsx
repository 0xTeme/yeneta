"use client";

import { Message, Language } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SpeakButton from "./SpeakButton";
import QuizCard from "./QuizCard";
import { FileText, Image as ImageIcon, Copy, Check, Edit2, Download, RefreshCw, Languages, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
}

interface Props {
  message: ExtendedMessage;
  language: Language;
  aiVoice: "male" | "female";
  onEdit?: (id: string, newText: string) => void;
  onRetry?: (id: string) => void;
  onTranslate?: (id: string, text: string) => void;
}

const CodeBlock = ({ match, codeString, children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group mt-4 mb-6">
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
        <span className="text-[10px] font-label font-bold text-content-inverse/80 bg-black/50 px-2 py-1 rounded uppercase tracking-widest">{match ? match[1] : "code"}</span>
        <button onClick={handleCopy} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 flex items-center gap-1">
          {copied ? <Check size={14} className="text-primary-text" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-[#1e293b] p-5 rounded-xl border border-border-strong font-mono text-sm overflow-x-auto custom-scrollbar leading-relaxed text-[#f8fafc]">
        <code className={className} {...props}>{children}</code>
      </pre>
    </div>
  );
};

export default function MessageBubble({ message, language, aiVoice, onEdit, onRetry, onTranslate }: Props) {
  const isUser = message.role === "user";
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!onTranslate || !message.content) return;
    setIsTranslating(true);
    try {
      await onTranslate(message.id, message.content);
    } finally {
      setIsTranslating(false);
    }
  };

  if (message.type === "quiz") {
    let quizData;
    try { quizData = JSON.parse(message.content); } catch { return null; }
    return <div className="flex w-full justify-start my-4"><QuizCard quiz={quizData} language={language} /></div>;
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Yeneta AI Response</title>');
      printWindow.document.write('<style>body{font-family:sans-serif;padding:40px;line-height:1.6;color:#0f172a;} pre{background:#f1f5f9;padding:15px;border-radius:8px;} code{background:#f1f5f9;padding:2px 4px;border-radius:4px;font-family:monospace;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<h2 style="color:#1a7a4c;">የኔታ (Yeneta) Response</h2><hr/>');
      
      const htmlContent = message.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/\n/g, '<br>');
        
      printWindow.document.write(htmlContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const submitEdit = () => {
    if (onEdit && editText.trim() !== message.content) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2 w-full my-4 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      
      {/* Sender Header */}
      <div className="flex items-center gap-3 mb-1">
        {!isUser && (
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-content-inverse text-[10px] font-bold shadow-sm">Y</div>
        )}
        <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-widest font-label">
          {isUser ? (language === "amharic" ? "አንተ" : "You") : (language === "amharic" ? "የኔታ" : "Yeneta Assistant")}
        </span>
      </div>

      <div className={`group max-w-[90%] md:max-w-[85%] rounded-2xl p-5 shadow-sm transition-all duration-300 border ${
          isUser 
            ? "bg-primary text-content-inverse rounded-tr-none border-primary shadow-primary/10" 
            : "bg-surface-glass backdrop-blur-md border-border-subtle text-content rounded-tl-none markdown-content"
        }`}>
        
        {/* If streaming just started and no content has arrived yet, show the unified spinner */}
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-3 py-1">
            <Loader2 size={20} className="text-primary animate-spin" />
            <span className="text-primary text-sm font-bold tracking-wide font-headline">
              {language === "amharic" ? "በማስኬድ ላይ..." : "Processing..."}
            </span>
          </div>
        ) : (
          <>
            {/* FILE NAME HEADER */}
            {message.fileName && (
              <div className={`flex items-center gap-2 mb-3 pb-3 text-xs font-semibold tracking-wide border-b ${isUser ? "border-white/20 text-content-inverse" : "border-border-subtle text-content-muted"}`}>
                {message.type === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}
                <span className="truncate">{message.fileName}</span>
              </div>
            )}

            {/* MESSAGE CONTENT OR EDIT MODE */}
            {isEditing ? (
              <div className="flex flex-col gap-3">
                <textarea
                  className="w-full bg-black/5 dark:bg-black/20 p-3 rounded-xl outline-none resize-none text-content text-sm font-body border border-border-strong focus:border-primary transition-colors shadow-inner"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={() => setIsEditing(false)} className="text-xs px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-hover text-content font-semibold transition-colors border border-border-subtle shadow-sm">Cancel</button>
                  <button onClick={submitEdit} className="text-xs px-4 py-2.5 rounded-lg bg-primary text-content-inverse font-bold hover:bg-primary-hover transition-colors shadow-sm">Save & Submit</button>
                </div>
              </div>
            ) : (
              <div className={`font-body leading-relaxed text-sm ${isUser ? "user-markdown" : ""} ${message.isStreaming && !isUser ? "typing-cursor" : ""}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        return <CodeBlock match={match} codeString={codeString} className={className} {...props}>{children}</CodeBlock>;
                      }
                      return <code className={`${isUser ? "bg-black/20 text-content-inverse" : ""} rounded-md px-1.5 py-0.5 font-mono text-xs`} {...props}>{children}</code>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* INLINE ACTION BAR */}
            <div className={`flex flex-wrap items-center gap-2 mt-4 pt-3 ${isUser ? "justify-end border-t border-white/20 text-content-inverse/80" : "justify-start border-t border-border-subtle text-content-muted"} opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
              
              {/* USER ACTIONS */}
              {isUser && !isEditing && (
                <>
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg hover:bg-black/10 flex items-center gap-1.5 text-xs font-semibold transition-colors" title="Edit Message"><Edit2 size={14}/> Edit</button>
                  <button onClick={handleCopyText} className="p-2 rounded-lg hover:bg-black/10 flex items-center gap-1.5 text-xs font-semibold transition-colors" title="Copy Text">
                    {copiedText ? <Check size={14} className="text-content-inverse" /> : <Copy size={14} />} {copiedText ? "Copied" : "Copy"}
                  </button>
                </>
              )}
              
              {/* AI ASSISTANT ACTIONS */}
              {!isUser && !message.isStreaming && (
                <>
                  <div className="hover:bg-surface-hover p-1 rounded-lg transition-colors">
                    <SpeakButton text={message.content} gender={aiVoice} />
                  </div>
                  
                  <button onClick={handleTranslate} disabled={isTranslating} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50">
                    {isTranslating ? <RefreshCw size={14} className="animate-spin text-primary" /> : <Languages size={14}/>} {isTranslating ? (language === "amharic" ? "ትርጉም..." : "Translating...") : (language === "amharic" ? "ትርጉም" : "Translate")}
                  </button>
                  
                  <button onClick={handleCopyText} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors">
                    {copiedText ? <Check size={14} className="text-primary" /> : <Copy size={14} />} {copiedText ? "Copied" : "Copy"}
                  </button>
                  
                  <button onClick={handleDownloadPDF} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors">
                    <Download size={14}/> PDF
                  </button>
                  
                  {onRetry && (
                    <button onClick={() => onRetry(message.id)} className="p-2 rounded-lg hover:bg-surface-hover hover:text-content flex items-center gap-1.5 text-xs font-semibold transition-colors">
                      <RefreshCw size={14}/> Retry
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
