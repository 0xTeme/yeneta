"use client";

import { useState, memo } from "react";
import { Quiz, Language } from "@/types";
import { Check, X, ArrowRight, RefreshCw, Verified, XCircle } from "lucide-react";

interface Props {
  quiz: Quiz;
  language: Language;
}

const QuizCard = memo(function QuizCard({ quiz, language }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const question = quiz.questions[currentIndex];
  const isFinished = currentIndex >= quiz.questions.length;
  const isAmharic = language === "amharic";

  const handleSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option.startsWith(question.correct + ")") || option.startsWith(question.correct)) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleRetryExam = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
  };

  if (isFinished || showResult) {
    const isPass = (score / quiz.questions.length) >= 0.5;

    return (
      <div className={`w-full max-w-[600px] backdrop-blur-md rounded-3xl p-8 shadow-sm border text-center animate-in zoom-in duration-500 ${isPass ? 'bg-surface-glass border-border-subtle' : 'bg-error-muted/30 border-error-base/50'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 outline outline-1 ${isPass ? 'bg-primary-muted outline-primary/30' : 'bg-error-muted outline-error-base/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'}`}>
          {isPass ? <Verified size={40} className="text-primary" /> : <XCircle size={40} className="text-error-base" />}
        </div>
        <h3 className={`text-2xl font-bold mb-2 font-headline ${isPass ? 'text-content' : 'text-error-base'}`}>
          {isAmharic ? (isPass ? "ፈተና ተጠናቋል!" : "ፈተናውን ወድቀዋል!") : (isPass ? "Quiz Completed!" : "Quiz Failed!")}
        </h3>
        <p className={`text-lg mb-8 font-label font-medium tracking-wide ${isPass ? 'text-content-muted' : 'text-error-base/80'}`}>
          {isAmharic ? "ውጤት:" : "Score:"} <span className={`font-bold ${isPass ? 'text-content' : 'text-error-base'}`}>{score}</span> / {quiz.questions.length}
        </p>
        
        <button onClick={handleRetryExam} className={`px-6 py-3 hover:bg-surface-hover rounded-xl border font-bold transition-all flex items-center justify-center gap-2 mx-auto active:scale-95 shadow-sm ${isPass ? 'bg-surface border-border-strong text-content' : 'bg-surface border-error-base/50 text-error-base'}`}>
          <RefreshCw size={18} /> {isAmharic ? "እንደገና ሞክር" : "Retry Exam"}
        </button>
      </div>
    );
  }

  const progressPercent = (currentIndex / quiz.questions.length) * 100;

  return (
    <div className="w-full max-w-[600px] bg-surface-glass backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm border border-border-subtle relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-end">
          <span className="font-label text-[0.6875rem] font-bold text-primary tracking-widest uppercase">
            {isAmharic ? "ጥያቄ" : "Question"} {currentIndex + 1} {isAmharic ? "ከ" : "of"} {quiz.questions.length}
          </span>
          <span className="font-label text-[0.6875rem] font-semibold text-content-muted">
            {Math.round(progressPercent)}% {isAmharic ? "ተጠናቋል" : "Complete"}
          </span>
        </div>
        <div className="h-1 w-full bg-border-subtle rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full shadow-sm transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-content leading-tight font-headline">
          {question.question}
        </h2>

        <div className="grid gap-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option.startsWith(question.correct + ")") || option.startsWith(question.correct);
            const showColors = selectedOption !== null;

            const letterMatch = option.match(/^([A-D])\)?/i);
            const letter = letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx);
            const text = option.replace(/^([A-D])\)?\s*/i, "");

            let containerClass = "bg-surface border border-border-subtle hover:bg-surface-hover hover:scale-[1.01] hover:shadow-sm cursor-pointer text-content-muted";
            let letterClass = "bg-border-subtle text-content-muted";
            let icon = null;

            if (showColors) {
              if (isCorrectOption) {
                containerClass = "bg-primary border-primary shadow-sm text-content-inverse";
                letterClass = "bg-white/20 text-content-inverse";
                icon = <Check size={18} className="text-content-inverse" />;
              } else if (isSelected && !isCorrectOption) {
                containerClass = "bg-error-base border-error-base shadow-md text-content-inverse";
                letterClass = "bg-white/20 text-content-inverse";
                icon = <X size={18} className="text-content-inverse" />;
              } else {
                containerClass = "bg-surface border border-border-subtle opacity-50 text-content-muted cursor-default";
                letterClass = "bg-border-subtle text-content-muted";
              }
            }

            return (
              <div
                key={idx}
                onClick={() => handleSelect(option)}
                className={`group relative flex items-center justify-between p-4 md:p-5 rounded-xl transition-all duration-200 ${containerClass}`}
              >
                <div className="flex items-center gap-4 pr-4">
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold font-label ${letterClass}`}>
                    {letter}
                  </div>
                  <span className="font-medium font-body leading-snug">{text}</span>
                </div>
                {icon && (
                  <div className="bg-white/20 rounded-full p-1 shrink-0">
                    {icon}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedOption && (
          <div className={`p-5 rounded-2xl border-l-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            (selectedOption && !selectedOption.startsWith(question.correct + ")") && !selectedOption.startsWith(question.correct))
              ? 'bg-error-muted/50 border-error-base' 
              : 'bg-surface border-primary'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[0.6875rem] font-bold font-label flex items-center gap-1.5 uppercase tracking-widest ${
                (selectedOption && !selectedOption.startsWith(question.correct + ")") && !selectedOption.startsWith(question.correct))
                ? 'text-error-base' : 'text-primary'
              }`}>
                {isAmharic ? "ማብራሪያ" : "Explanation"} <Verified size={14} />
              </span>
            </div>
            <p className="text-sm text-content-muted leading-relaxed font-body">
              {question.explanation}
            </p>
          </div>
        )}

        {selectedOption && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 animate-in fade-in duration-300">
            <button
              onClick={handleNext}
              className="flex-1 bg-primary text-content-inverse font-bold py-4 rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isAmharic ? "ቀጣይ ጥያቄ" : "Next Question"}
              <ArrowRight size={18} />
            </button>
            
            {quiz.questions.length >= 20 && (
              <button
                onClick={() => setSelectedOption(null)}
                className="flex-none px-6 py-4 text-content font-semibold bg-surface hover:bg-surface-hover rounded-xl border border-border-strong active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                {isAmharic ? "እንደገና" : "Retry"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default QuizCard;
