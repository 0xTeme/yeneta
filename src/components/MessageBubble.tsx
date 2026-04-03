"use client";

import { Message, Language } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SpeakButton from "./SpeakButton";
import QuizCard from "./QuizCard";
import { FileText, Image as ImageIcon, Copy, Check, Edit2, Download, RefreshCw } from "lucide-react";
import { useState } from "react";

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
}

interface Props {
  message: ExtendedMessage;
  language: Language;
  onEdit?: (id: string, newText: string) => void;
  onRetry?: (id: string) => void;
}

const CodeBlock = ({ match, codeString, children, className, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative bg-[#1e1e2e] rounded-lg my-4 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d3b] text-xs text-gray-300">
        <span>{match[1]}</span>
        <button onClick={handleCopy} className="hover:text-white flex items-center gap-1 transition-colors">
          {copied ? <><Check size={14} className="text-green-500"/> Copied</> : <><Copy size={14}/> Copy</>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm text-gray-100 font-mono">
        <code className={className} {...props}>{children}</code>
      </div>
    </div>
  );
};

export default function MessageBubble({ message, language, onEdit, onRetry }: Props) {
  const isUser = message.role === "user";
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

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
      printWindow.document.write('<style>body{font-family:sans-serif;padding:40px;line-height:1.6;color:#1a1a2e;} pre{background:#f1f5f9;padding:15px;border-radius:8px;} code{background:#f1f5f9;padding:2px 4px;border-radius:4px;font-family:monospace;}</style>');
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
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} my-4`}>
      <div className={`group max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
          isUser ? "bg-[#1a7a4c] text-white rounded-br-none" : "bg-white border border-gray-100 text-[#1a1a2e] rounded-bl-none"
        } ${message.isStreaming ? "animate-pulse" : ""}`}
      >
        {/* FILE NAME HEADER */}
        {message.fileName && (
          <div className={`flex items-center gap-2 mb-2 pb-2 text-sm border-b ${isUser ? "border-green-600/50" : "border-gray-200"}`}>
            {message.type === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}
            <span className="truncate">{message.fileName}</span>
          </div>
        )}

        {/* MESSAGE CONTENT OR EDIT MODE */}
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full bg-white/10 p-2 rounded outline-none resize-none text-white text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 transition">Cancel</button>
              <button onClick={submitEdit} className="text-xs px-3 py-1.5 rounded bg-white text-[#1a7a4c] font-bold hover:bg-gray-100 transition">Save & Submit</button>
            </div>
          </div>
        ) : (
          <div className={`markdown-body ${isUser ? "prose-invert" : ""}`}>
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
                  return <code className={`${isUser ? "bg-black/20 text-white" : "bg-black/5 text-[#e63946]"} rounded px-1 py-0.5 font-mono text-sm`} {...props}>{children}</code>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* INLINE ACTION BAR */}
        <div className={`flex items-center gap-4 mt-3 pt-2 ${isUser ? "justify-end border-t border-white/20 text-white/80" : "justify-start border-t border-gray-100 text-gray-500"} opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
          
          {/* USER ACTIONS */}
          {isUser && !isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="hover:text-white flex items-center gap-1 text-[11px] font-medium" title="Edit Message"><Edit2 size={14}/> Edit</button>
              <button onClick={handleCopyText} className="hover:text-white flex items-center gap-1 text-[11px] font-medium" title="Copy Text">
                {copiedText ? <Check size={14} className="text-green-300" /> : <Copy size={14} />} {copiedText ? "Copied" : "Copy"}
              </button>
            </>
          )}
          
          {/* AI ASSISTANT ACTIONS */}
          {!isUser && !message.isStreaming && (
            <>
              <SpeakButton text={message.content} language={language} />
              
              <button onClick={handleCopyText} className="hover:text-[#1a7a4c] flex items-center gap-1 text-[11px] font-medium transition-colors">
                {copiedText ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} {copiedText ? "Copied" : "Copy"}
              </button>
              
              <button onClick={handleDownloadPDF} className="hover:text-[#1a7a4c] flex items-center gap-1 text-[11px] font-medium transition-colors">
                <Download size={14}/> PDF
              </button>
              
              {onRetry && (
                <button onClick={() => onRetry(message.id)} className="hover:text-[#1a7a4c] flex items-center gap-1 text-[11px] font-medium transition-colors">
                  <RefreshCw size={14}/> Retry
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
