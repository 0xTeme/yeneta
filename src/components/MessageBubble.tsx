"use client";

import { useState } from "react";
import { Message, Language } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import SpeakButton from "./SpeakButton";
import QuizCard from "./QuizCard";
import { FileText, Image as ImageIcon, Copy, Check, RefreshCw, Edit2 } from "lucide-react";

interface ExtendedMessage extends Message {
  isStreaming?: boolean;
}

interface Props {
  message: ExtendedMessage;
  language: Language;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
}

// Sub-component to handle individual code block copy states
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

export default function MessageBubble({ message, language, onRetry, onEdit }: Props) {
  const isUser = message.role === "user";
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const submitEdit = () => {
    if (onEdit && editText.trim() !== message.content) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  if (message.type === "quiz") {
    let quizData;
    try { quizData = JSON.parse(message.content); } catch { return null; }
    return <div className="flex w-full justify-start my-4"><QuizCard quiz={quizData} language={language} /></div>;
  }

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} my-4 group`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm relative ${
          isUser ? "bg-[#1a7a4c] text-white rounded-br-none" : "bg-white border border-gray-100 text-[#1a1a2e] rounded-bl-none"
        } ${message.isStreaming ? "animate-pulse" : ""}`}
      >
        {message.fileName && (
          <div className={`flex items-center gap-2 mb-2 pb-2 text-sm border-b ${isUser ? "border-green-600/50" : "border-gray-200"}`}>
            {message.type === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}
            <span className="truncate">{message.fileName}</span>
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full bg-white/10 p-2 rounded outline-none resize-none text-white text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">Cancel</button>
              <button onClick={submitEdit} className="text-xs px-3 py-1.5 rounded-lg bg-white text-[#1a7a4c] font-bold hover:bg-gray-100 transition-colors">Save & Resend</button>
            </div>
          </div>
        ) : (
          <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}>
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
                  return <code className="bg-black/10 text-[#e63946] rounded px-1.5 py-0.5 font-mono text-sm" {...props}>{children}</code>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute ${isUser ? "-left-10" : "-right-16"} top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
          {isUser && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-[#1a7a4c] bg-white rounded-full shadow border border-gray-100"><Edit2 size={14}/></button>
          )}
          {!isUser && !message.isStreaming && (
            <>
              <button onClick={handleCopyText} className="p-1.5 text-gray-400 hover:text-[#1a7a4c] bg-white rounded-full shadow border border-gray-100" title="Copy Message">
                {copiedText ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <SpeakButton text={message.content} language={language} />
              {onRetry && (
                <button onClick={() => onRetry(message.id)} className="p-1.5 text-gray-400 hover:text-[#f0a500] bg-white rounded-full shadow border border-gray-100" title="Retry">
                  <RefreshCw size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}