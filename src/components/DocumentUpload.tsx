"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText, Loader2, BookOpen, List, GraduationCap, AlertCircle } from "lucide-react";
import { Language, DocumentAction } from "@/types";

interface Props {
  language: Language;
  onClose: () => void;
  onProcess: (file: File, action: DocumentAction, questionCount?: number) => void;
  isProcessing: boolean;
}

export default function DocumentUpload({ language, onClose, onProcess, isProcessing }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [showQuizMenu, setShowQuizMenu] = useState(false);
  const isAmharic = language === "amharic";

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setUploadError("");
    if (fileRejections.length > 0) {
      setUploadError(isAmharic ? "ያልተደገፈ ፋይል አይነት ወይም መጠኑ በጣም ትልቅ ነው።" : "Unsupported file format or file too large.");                
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [isAmharic]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 4 * 1024 * 1024, // CRITICAL FIX: Lowered to 4MB to prevent Vercel 4.5MB payload limit hard crashes.
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    disabled: isProcessing,
  });

  return (
    <div className="w-full mx-auto max-w-[500px] bg-surface-glass backdrop-blur-xl shadow-sm border border-border-subtle rounded-2xl p-6 md:p-8 flex flex-col gap-6 transition-transform duration-300 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div className="space-y-1 text-left">
          <h2 className="text-content text-xl md:text-2xl font-bold tracking-tight font-headline">
            {isAmharic ? "ማጥኛ ቁሳቁስ ስቀል" : "Upload your document"}
          </h2>
          <p className="text-content-muted text-sm font-medium font-body">
            {isAmharic ? "ፋይሎን እዚህ ይስቀሉ" : "Empower Yeneta with your local knowledge base"}
          </p>
        </div>
        <button 
          onClick={onClose} 
          disabled={isProcessing} 
          className="text-content-muted hover:text-content bg-surface hover:bg-surface-hover p-2 rounded-full transition-all disabled:opacity-50 border border-border-subtle"
        >
          <X size={20} />
        </button>
      </div>

      {!file ? (
        /* Upload Zone */
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 cursor-pointer group z-10 ${
            uploadError
              ? "border-error-base/40 bg-error-muted" 
              : isDragActive 
                ? "border-primary shadow-sm bg-primary-muted" 
                : "border-border-strong hover:border-primary hover:shadow-sm bg-transparent"
          }`}
        >
          <input {...getInputProps()} />
          
          {uploadError ? (
            <>
              <div className="w-16 h-16 rounded-full bg-error-base/10 flex items-center justify-center text-error-text mb-2 outline outline-1 outline-error-base/30">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-content">
                  {isAmharic ? "የስቀላ ስህተት" : "Analysis Error"}
                </h3>
                <p className="text-error-text font-label text-sm mt-1 font-medium tracking-wide">
                  {uploadError}
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setUploadError(""); }} className="mt-2 py-2.5 px-6 border border-error-base/30 rounded-lg text-error-text font-bold text-sm hover:bg-error-base/20 transition-all active:scale-95 font-headline bg-surface">
                {isAmharic ? "እንደገና ለመሞከር ይጫኑ" : "Retry Upload"}  
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-110 outline outline-1 outline-primary/30">
                <UploadCloud className="text-primary w-8 h-8" />
              </div>
              <div>
                <p className="text-content font-semibold font-headline">
                  {isAmharic ? "ፋይሉን እዚህ ይጎትቱ ወይም ይጫኑ" : "Drop file here or click to browse"}
                </p>
                <p className="text-content-muted text-[0.6875rem] font-bold font-label uppercase tracking-widest mt-2">
                  PDF, DOCX, PPTX, TXT, JPG, PNG (Max 4MB)
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Active State / Actions */
        <div className="space-y-6 z-10">
          
          {/* Selected File Card */}
          <div className="bg-surface rounded-xl p-4 flex flex-col gap-3 border border-border-subtle shadow-sm transition-all duration-300 hover:bg-surface-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                  file.name.toLowerCase().endsWith('.pdf') ? 'bg-error-muted text-error-text' : 
                  file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 
                  'bg-primary-muted text-primary'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-content font-bold font-headline text-sm truncate pr-2">
                    {file.name}
                  </span>
                  <span className="text-content-muted text-[0.6875rem] font-bold font-label tracking-widest uppercase mt-0.5">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              
              {!isProcessing && (
                <button 
                  onClick={() => setFile(null)} 
                  className="text-content-muted hover:text-error-text hover:bg-error-muted p-2 rounded-lg transition-all shrink-0"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Progress Bar (Visible only during processing) */}
            {isProcessing && (
              <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-primary h-full w-full rounded-full transition-all duration-1000 ease-out animate-pulse" />
              </div>
            )}
          </div>

          {!isProcessing ? (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[0.6875rem] font-bold text-center uppercase tracking-widest text-content-muted font-label">
                {isAmharic ? "ምን ላድርግልዎ?" : "What would you like me to do?"}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onProcess(file, "explain")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-2.5 p-4 bg-surface border border-border-subtle rounded-xl hover:bg-surface-hover hover:border-primary/50 transition-all group disabled:opacity-50"
                >
                  <BookOpen size={22} className="text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-content font-headline">{isAmharic ? "አስረዳኝ" : "Explain"}</span>
                </button>
                <button
                  onClick={() => onProcess(file, "summarize")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-2.5 p-4 bg-surface border border-border-subtle rounded-xl hover:bg-surface-hover hover:border-blue-500/50 transition-all group disabled:opacity-50"
                >
                  <List size={22} className="text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-content font-headline">{isAmharic ? "አጠቃልልኝ" : "Summarize"}</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowQuizMenu(!showQuizMenu)}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center gap-2.5 p-4 bg-surface border border-border-subtle rounded-xl hover:bg-surface-hover hover:border-orange-500/50 transition-all group disabled:opacity-50"
                  >
                    <GraduationCap size={22} className="text-orange-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-content font-headline">{isAmharic ? "ፈትነኝ" : "Quiz Me"}</span>
                  </button>
                  
                  {showQuizMenu && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface-glass backdrop-blur-xl border border-border-subtle rounded-xl p-3 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[140px]">
                      <p className="text-[0.625rem] font-bold text-content-muted uppercase tracking-widest mb-2 font-label text-center">
                        {isAmharic ? "ጥያቄዎች" : "Questions"}
                      </p>
                      <div className="flex flex-col gap-1">
                        {[5, 10, 20].map(count => (
                          <button
                            key={count}
                            onClick={() => {
                              setShowQuizMenu(false);
                              onProcess(file, "quiz", count);
                            }}
                            className="px-4 py-2 text-xs font-bold text-content bg-surface hover:bg-surface-hover rounded-lg transition-all font-headline"
                          >
                            {count} {isAmharic ? "ጥያቄ" : "Questions"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 mt-4 py-4 animate-in fade-in duration-300">
              <Loader2 size={28} className="text-primary animate-spin" />
              <span className="text-primary text-sm font-bold tracking-wide font-headline mt-2">
                {isAmharic ? "በማስኬድ ላድ..." : "Processing document..."}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
