"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Paperclip, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { Language } from "@/types";
import { startRecordingAudio } from "@/lib/speech";

interface Props {
  onSend: (message: string, file?: File) => void;
  onToggleUpload: () => void;
  language: Language;
  isLoading: boolean;
  onStopGeneration: () => void;
}

export default function ChatInput({ onSend, onToggleUpload, language, isLoading, onStopGeneration }: Props) {
  const [text, setText] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isAmharic = language === "amharic";

  // SAFE FIX: Smooth auto-resize logic for the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      if (text) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
      }
    }
  }, [text]);

  const handleSend = () => {
    if ((text.trim() || stagedFile) && !isLoading && !isTranscribing) {
      if (text.trim()) setMessageHistory((prev) => [text.trim(), ...prev]);
      setHistoryIndex(-1);
      onSend(text.trim(), stagedFile || undefined);
      setText("");
      setStagedFile(null);
      setSpeechError("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      handleSend(); 
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (messageHistory.length === 0) return;
      const newIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
      setHistoryIndex(newIndex); setText(messageHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) { setHistoryIndex(-1); setText(""); return; }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex); setText(messageHistory[newIndex]);
    }
  };

  const toggleMic = async () => {
    if (isTranscribing) return;
    setSpeechError("");

    if (isRecording) {
      if (stopFnRef.current) stopFnRef.current();
      setIsRecording(false);
      setIsTranscribing(true);
      return;
    }

    stopFnRef.current = await startRecordingAudio(
      (transcribedText) => {
        setText((prev) => prev + (prev ? " " : "") + transcribedText);
        setIsTranscribing(false);
      },
      (error) => {
        setSpeechError(error);
        setIsTranscribing(false);
      },
      () => setIsRecording(true)
    );
  };

  return (
    <div className="w-full flex flex-col items-center p-4 sm:p-6 sm:pb-8 bg-gradient-to-t from-background via-background/90 to-transparent sticky bottom-0 z-20 gap-3">
      
      {/* File Staging Indicator */}
      {stagedFile && (
        <div className="flex items-center gap-3 bg-primary-muted text-primary-text px-4 py-2.5 rounded-xl w-max border border-primary/20 backdrop-blur-md shadow-sm animate-in slide-in-from-bottom-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <FileText size={14} />
          </div>
          <span className="text-sm max-w-[200px] truncate font-semibold font-body tracking-wide">{stagedFile.name}</span>
          <button onClick={() => setStagedFile(null)} className="hover:text-primary hover:bg-primary/10 p-1 rounded-md transition-all ml-1"><X size={14} /></button>
        </div>
      )}

      {/* Speech Error Indicator */}
      {speechError && (
        <div className="pointer-events-auto bg-surface-glass backdrop-blur-xl border border-error-base/30 rounded-2xl p-4 shadow-sm flex items-center gap-4 min-w-[320px] max-w-md transition-all duration-300 animate-in slide-in-from-bottom-4">
          <div className="w-10 h-10 shrink-0 rounded-full bg-error-muted flex items-center justify-center text-error-text outline outline-1 outline-error-base/40">
            <AlertCircle size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="font-headline font-bold text-sm text-content truncate">{isAmharic ? "የድምጽ ስህተት" : "Microphone Error"}</p>
            <p className="font-label text-xs text-error-text/80 font-medium tracking-wide truncate">{speechError}</p>
          </div>
          <button onClick={() => setSpeechError("")} className="ml-auto p-2 text-content-muted hover:text-content hover:bg-surface-hover rounded-lg transition-all">
            <X size={16}/>
          </button>
        </div>
      )}

      {/* Main Glass Input Bar */}
      <div className="relative w-full max-w-3xl">
        <div className={`w-full bg-surface-glass backdrop-blur-xl border rounded-2xl p-2 flex items-end gap-2 transition-all duration-300 ${
          speechError 
            ? "border-error-base/50 ring-4 ring-error-base/10 shadow-sm" 
            : "border-border-strong shadow-sm focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary"
        }`}>
          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setStagedFile(e.target.files[0])} />
          
          {/* Upload Toggle Button (REMOVED hidden sm:flex) */}
          <button onClick={onToggleUpload} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-content-muted hover:text-content hover:bg-surface-hover transition-all">
            <Paperclip size={20} />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? (isAmharic ? "ድምጽዎን እየተረጎምኩ ነው..." : "Transcribing audio...") : isRecording ? (isAmharic ? "እየሰማሁ ነው (ለማቆም ይጫኑ)..." : "Listening (click to stop)...") : (isAmharic ? "የኔታን ማንኛውንም ጥያቄ ይጠይቁ..." : "Ask Yeneta anything...")}
            className={`flex-1 bg-transparent border-none outline-none focus:ring-0 text-content py-2.5 px-2 font-body text-sm min-w-0 resize-none max-h-32 ${speechError ? "placeholder-error-text/50" : "placeholder-content-muted/60"}`}
            disabled={isLoading || isRecording || isTranscribing}
            rows={1}
          />
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mic / Recording Button */}
            <button 
              onClick={toggleMic} 
              disabled={isTranscribing} 
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                isRecording 
                  ? "text-error-text bg-error-muted outline outline-1 outline-error-base/40 animate-pulse" 
                  : isTranscribing 
                    ? "text-primary" 
                    : "text-content-muted hover:text-content hover:bg-surface-hover"
              }`}
            >
              {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
            </button>

            {/* Action / Send Button */}
            {isLoading ? (
              <button onClick={onStopGeneration} className="w-10 h-10 flex items-center justify-center rounded-xl bg-error-base text-content-inverse hover:bg-error-hover shadow-sm transition-all">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button onClick={handleSend} disabled={(!text.trim() && !stagedFile) || isTranscribing} className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-content-inverse hover:brightness-110 shadow-sm disabled:opacity-50 disabled:hover:brightness-100 transition-all active:scale-95">
                <Send size={18} className={text.trim() || stagedFile ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
              </button>
            )}
          </div>
        </div>

        {/* Floating Validation Label */}
        {speechError && (
          <div className="absolute -bottom-6 left-4 flex items-center gap-1.5 text-error-text text-[10px] font-bold font-label uppercase tracking-wider animate-in fade-in duration-300">
            <AlertCircle size={12} />
            {isAmharic ? "እባክዎ እንደገና ይሞክሩ" : "Please try again"}
          </div>
        )}
      </div>
    </div>
  );
}
